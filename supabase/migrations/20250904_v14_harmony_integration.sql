-- v1.4 ハモリ統合機能対応マイグレーション
-- ハモリ機能とプレビュー統合、プラン別課金の実装

-- jobsテーブルにハモリ関連カラム追加（互換性保持）
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS harmony_paths jsonb,            -- ユーザーアップロードハモリパス群
  ADD COLUMN IF NOT EXISTS harmony_generated boolean DEFAULT false, -- ハモリ生成フラグ
  ADD COLUMN IF NOT EXISTS harmony_mode text,              -- 準備した候補モード
  ADD COLUMN IF NOT EXISTS harmony_choice text,            -- ユーザー確定構成
  ADD COLUMN IF NOT EXISTS harmony_level_db numeric DEFAULT -6; -- ハモリレベル

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobs_harmony_choice ON public.jobs (harmony_choice);
CREATE INDEX IF NOT EXISTS idx_jobs_harmony_generated ON public.jobs (harmony_generated);

-- クレジット残高取得関数（既存の場合は更新）
CREATE OR REPLACE FUNCTION get_credit_balance(target_user_id uuid)
RETURNS numeric AS $$
DECLARE
  balance numeric := 0;
BEGIN
  -- クレジット台帳の合計を計算
  SELECT COALESCE(SUM(credits), 0) INTO balance
  FROM public.credit_ledger
  WHERE user_id = target_user_id;

  RETURN balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ハモリ課金履歴ビュー（分析用）
CREATE OR REPLACE VIEW public.harmony_usage_stats AS
SELECT 
  j.user_id,
  s.plan_code,
  j.harmony_choice,
  j.harmony_level_db,
  j.created_at as job_created,
  cl.credits as harmony_cost,
  cl.created_at as charged_at
FROM public.jobs j
LEFT JOIN public.subscriptions s ON j.user_id = s.user_id AND s.status = 'active'
LEFT JOIN public.credit_ledger cl ON j.id = cl.job_id AND cl.reason LIKE '%Harmony application%'
WHERE j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none';

-- RLS適用
ALTER VIEW public.harmony_usage_stats OWNER TO postgres;

-- 統計用関数：プラン別ハモリ利用率
CREATE OR REPLACE FUNCTION get_harmony_usage_by_plan(
  start_date timestamptz DEFAULT (now() - interval '30 days'),
  end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  plan_code text,
  total_jobs bigint,
  harmony_jobs bigint,
  usage_rate numeric,
  avg_harmony_level numeric,
  total_harmony_cost numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.plan_code, 'none') as plan_code,
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' THEN 1 END) as harmony_jobs,
    ROUND(
      COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' THEN 1 END)::numeric / 
      NULLIF(COUNT(j.id), 0) * 100, 2
    ) as usage_rate,
    ROUND(AVG(CASE WHEN j.harmony_choice IS NOT NULL THEN j.harmony_level_db END), 1) as avg_harmony_level,
    COALESCE(SUM(ABS(cl.credits)), 0) as total_harmony_cost
  FROM public.jobs j
  LEFT JOIN public.subscriptions s ON j.user_id = s.user_id AND s.status = 'active'
  LEFT JOIN public.credit_ledger cl ON j.id = cl.job_id AND cl.reason LIKE '%Harmony application%'
  WHERE j.created_at >= start_date AND j.created_at <= end_date
  GROUP BY COALESCE(s.plan_code, 'none')
  ORDER BY total_jobs DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ハモリ確定トリガー関数
CREATE OR REPLACE FUNCTION harmony_apply_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- ハモリが確定された場合のログ
  IF NEW.harmony_choice IS NOT NULL AND NEW.harmony_choice != 'none' AND 
     (OLD.harmony_choice IS NULL OR OLD.harmony_choice != NEW.harmony_choice) THEN
    
    -- ログ出力（アプリケーションで利用）
    INSERT INTO public.application_logs (
      level, 
      message, 
      context, 
      created_at
    ) VALUES (
      'info',
      'Harmony applied to job',
      jsonb_build_object(
        'job_id', NEW.id,
        'user_id', NEW.user_id,
        'harmony_choice', NEW.harmony_choice,
        'harmony_level_db', NEW.harmony_level_db
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ログテーブル作成（存在しない場合）
CREATE TABLE IF NOT EXISTS public.application_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  message text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS設定
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;

-- アプリケーションログのRLSポリシー（管理者のみ）
DROP POLICY IF EXISTS "Admin only access to application logs" ON public.application_logs;
CREATE POLICY "Admin only access to application logs" 
  ON public.application_logs 
  FOR ALL 
  USING (false); -- 通常のユーザーはアクセス不可

-- ハモリ適用トリガー作成
DROP TRIGGER IF EXISTS harmony_apply_trigger ON public.jobs;
CREATE TRIGGER harmony_apply_trigger
  AFTER UPDATE OF harmony_choice, harmony_level_db ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION harmony_apply_trigger();

-- パフォーマンス最適化用インデックス
CREATE INDEX IF NOT EXISTS idx_jobs_user_harmony ON public.jobs (user_id, harmony_choice) 
  WHERE harmony_choice IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_harmony ON public.credit_ledger (user_id, job_id) 
  WHERE reason LIKE '%Harmony%';

-- 統計テーブル（日次バッチ更新用）
CREATE TABLE IF NOT EXISTS public.daily_harmony_stats (
  stat_date date PRIMARY KEY,
  total_jobs integer DEFAULT 0,
  harmony_jobs integer DEFAULT 0,
  lite_harmony_jobs integer DEFAULT 0,
  standard_harmony_jobs integer DEFAULT 0,
  creator_harmony_jobs integer DEFAULT 0,
  total_harmony_cost numeric DEFAULT 0,
  avg_harmony_level numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS設定
ALTER TABLE public.daily_harmony_stats ENABLE ROW LEVEL SECURITY;

-- 統計テーブルのRLSポリシー（管理者のみ）
DROP POLICY IF EXISTS "Admin only access to harmony stats" ON public.daily_harmony_stats;
CREATE POLICY "Admin only access to harmony stats" 
  ON public.daily_harmony_stats 
  FOR ALL 
  USING (false); -- 通常のユーザーはアクセス不可

-- 日次統計更新関数
CREATE OR REPLACE FUNCTION update_daily_harmony_stats(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  stat_record record;
BEGIN
  -- 指定日の統計を計算
  SELECT 
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' THEN 1 END) as harmony_jobs,
    COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' AND s.plan_code = 'lite' THEN 1 END) as lite_harmony_jobs,
    COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' AND s.plan_code = 'standard' THEN 1 END) as standard_harmony_jobs,
    COUNT(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' AND s.plan_code = 'creator' THEN 1 END) as creator_harmony_jobs,
    COALESCE(SUM(ABS(cl.credits)), 0) as total_harmony_cost,
    ROUND(AVG(CASE WHEN j.harmony_choice IS NOT NULL AND j.harmony_choice != 'none' THEN j.harmony_level_db END), 1) as avg_harmony_level
  INTO stat_record
  FROM public.jobs j
  LEFT JOIN public.subscriptions s ON j.user_id = s.user_id
  LEFT JOIN public.credit_ledger cl ON j.id = cl.job_id AND cl.reason LIKE '%Harmony application%'
  WHERE DATE(j.created_at) = target_date;

  -- upsert実行
  INSERT INTO public.daily_harmony_stats (
    stat_date,
    total_jobs,
    harmony_jobs,
    lite_harmony_jobs,
    standard_harmony_jobs,
    creator_harmony_jobs,
    total_harmony_cost,
    avg_harmony_level,
    updated_at
  ) VALUES (
    target_date,
    stat_record.total_jobs,
    stat_record.harmony_jobs,
    stat_record.lite_harmony_jobs,
    stat_record.standard_harmony_jobs,
    stat_record.creator_harmony_jobs,
    stat_record.total_harmony_cost,
    stat_record.avg_harmony_level,
    now()
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    total_jobs = EXCLUDED.total_jobs,
    harmony_jobs = EXCLUDED.harmony_jobs,
    lite_harmony_jobs = EXCLUDED.lite_harmony_jobs,
    standard_harmony_jobs = EXCLUDED.standard_harmony_jobs,
    creator_harmony_jobs = EXCLUDED.creator_harmony_jobs,
    total_harmony_cost = EXCLUDED.total_harmony_cost,
    avg_harmony_level = EXCLUDED.avg_harmony_level,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- サンプルデータ構造（ドキュメント用）
/*
-- harmony_paths の構造例
{
  "user_uploaded": [
    {"path": "harmonies/user123/job456/harmony1.wav", "name": "ハモリ1"},
    {"path": "harmonies/user123/job456/harmony2.wav", "name": "ハモリ2"}
  ],
  "generated": [
    {"mode": "up_m3", "path": "harmonies/generated/job456/up_m3.wav"},
    {"mode": "down_m3", "path": "harmonies/generated/job456/down_m3.wav"},
    {"mode": "p5", "path": "harmonies/generated/job456/p5.wav"},
    {"mode": "up_down", "path": "harmonies/generated/job456/up_down.wav"}
  ]
}

-- harmony_choice の値
- 'none': ハモリなし
- 'up_m3': Lead + 上3度
- 'down_m3': Lead + 下3度  
- 'p5': Lead + 完全5度
- 'up_down': Lead + 上3度 + 下3度

-- harmony_level_db の範囲
- -12.0 ～ 0.0 dB (UIフェーダー)
*/

-- 最終確認用クエリ
DO $$
BEGIN
  -- テーブル存在確認
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'jobs table not found';
  END IF;
  
  -- カラム追加確認
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'harmony_choice' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'harmony_choice column not added';
  END IF;
  
  RAISE NOTICE 'v1.4 Harmony Integration migration completed successfully';
END $$;