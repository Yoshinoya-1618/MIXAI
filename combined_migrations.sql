-- MIXAI Combined Migrations for Supabase Dashboard
-- Generated from all migration files
-- Execute in Supabase Dashboard SQL Editor

-- ========================================
-- 01_initial_schema.sql
-- ========================================

-- CLAUDE.mdに基づくデータベーススキーマ

-- 1. Enums（列挙型）の定義
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('uploaded','paid','processing','done','failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inst_policy AS ENUM ('bypass','safety','rescue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE credit_event AS ENUM ('grant','consume','purchase','rollback','expire');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sub_status AS ENUM ('none','active','past_due','canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. プラン定義テーブル
CREATE TABLE IF NOT EXISTS public.plans (
  code text primary key,                  -- 'lite'|'standard'|'creator'
  name text not null,
  price_jpy integer not null,
  monthly_credits numeric not null,
  created_at timestamptz default now()
);

-- 3. メインのジョブテーブル
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  -- 入力/出力ファイル
  instrumental_path text,
  vocal_path text,
  result_path text,
  out_format text default 'mp3',          -- 'mp3'|'wav'
  sample_rate int default 44100,          -- 44100|48000
  bit_depth int default 16,               -- 16|24 (wav時)

  -- 解析/処理パラメータ
  plan_code text references public.plans(code),
  preset_key text,                        -- 'clean_light'等（12種）
  inst_policy inst_policy default 'bypass',
  micro_adjust jsonb,                     -- {forwardness, space, brightness}
  offset_ms integer,                      -- 自動頭出し結果
  atempo numeric,                         -- 例: 0.98～1.03
  tempo_map_applied boolean default false,
  rescue_applied boolean default false,

  -- メトリクス（Before/After）
  beat_dev_ms_before numeric,             -- 拍ズレ平均（ms）
  beat_dev_ms_after numeric,
  pitch_err_cent_before numeric,          -- ノート中心誤差（cent）
  pitch_err_cent_after numeric,
  hnr_before numeric,                     -- Harmonic-to-Noise Ratio
  hnr_after numeric,

  -- ラウドネス
  target_lufs numeric not null default -14,
  measured_lufs numeric,
  true_peak numeric,

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. クレジット台帳
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event credit_event not null,
  credits numeric not null,               -- 正: 付与/購入、負: 消費
  reason text,
  job_id uuid references public.jobs(id),
  created_at timestamptz default now()
);

-- 5. サブスクリプション
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan_code text references public.plans(code),
  status sub_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  auto_buy_addon boolean default true,    -- 残高不足時の自動追加購入
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. RLSポリシーの設定
alter table public.jobs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.subscriptions enable row level security;

-- ユーザーは自分のデータのみアクセス可能（既存チェック）
DO $$ BEGIN
    CREATE POLICY "Users can view own jobs" ON public.jobs
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- 8. 初期プランデータの挿入
INSERT INTO public.plans (code, name, price_jpy, monthly_credits) 
SELECT 'lite', 'Lite', 1280, 3.0
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'lite');

INSERT INTO public.plans (code, name, price_jpy, monthly_credits) 
SELECT 'standard', 'Standard', 2480, 6.0
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'standard');

INSERT INTO public.plans (code, name, price_jpy, monthly_credits) 
SELECT 'creator', 'Creator', 5980, 10.0
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'creator');

-- 9. トリガー関数（更新時刻の自動更新）
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- トリガー作成（既存チェック）
DO $$ BEGIN
    CREATE TRIGGER handle_jobs_updated_at
        BEFORE UPDATE ON public.jobs
        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER handle_subscriptions_updated_at
        BEFORE UPDATE ON public.subscriptions
        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. ストレージバケットの作成（Supabase Storage用）
INSERT INTO storage.buckets (id, name, public) 
SELECT 'uta-uploads', 'uta-uploads', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'uta-uploads');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'uta-results', 'uta-results', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'uta-results');

-- 11. ストレージのRLSポリシー設定手順
-- 注意: ストレージポリシーはSupabaseダッシュボードのStorageセクションで手動設定してください

-- === uta-uploads バケット用ポリシー ===

-- 1. ポリシー名: "Allow users to upload own files"
-- 操作: INSERT
-- 適用対象: Authenticated users only
-- 条件式:
-- bucket_id = 'uta-uploads' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text

-- 2. ポリシー名: "Allow users to read own uploaded files"
-- 操作: SELECT
-- 適用対象: Authenticated users only
-- 条件式:
-- bucket_id = 'uta-uploads' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text

-- === uta-results バケット用ポリシー ===

-- 3. ポリシー名: "Allow users to read own result files"
-- 操作: SELECT
-- 適用対象: Authenticated users only
-- 条件式:
-- bucket_id = 'uta-results' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text

-- 4. ポリシー名: "Allow service role to write result files"
-- 操作: INSERT, UPDATE
-- 適用対象: Service role only
-- 条件式:
-- bucket_id = 'uta-results'

-- ========================================
-- 20250903_add_analysis_fields.sql
-- ========================================

-- 高度なオフセット検出と解析機能のためのカラム追加

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS detected_offset_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_confidence DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS recommended_preset TEXT,
ADD COLUMN IF NOT EXISTS vocal_quality_score TEXT DEFAULT 'standard';

-- ========================================
-- 20250904_v13_mix_params.sql
-- ========================================

-- MIX後の微調整機能（v1.3）対応
-- AI適用後パラメータとスナップショット管理

-- jobsテーブルに新カラム追加（後方互換）
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ai_params jsonb,              -- AI適用直後（AI_BASE）
  ADD COLUMN IF NOT EXISTS user_params jsonb,            -- 現在の編集（USER_EDIT）  
  ADD COLUMN IF NOT EXISTS last_export_params jsonb,     -- 直近書き出し（LAST_EXPORT）
  ADD COLUMN IF NOT EXISTS metrics jsonb;                -- LUFS/TP/PLR/GRなど

-- Creatorの参照曲解析テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS public.mix_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL,                              -- 参照曲のアップロードID
  analysis jsonb NOT NULL,                              -- tonal/dynamics/stereo/weights
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobs_ai_params ON public.jobs USING gin (ai_params);
CREATE INDEX IF NOT EXISTS idx_jobs_user_params ON public.jobs USING gin (user_params);
CREATE INDEX IF NOT EXISTS idx_jobs_metrics ON public.jobs USING gin (metrics);
CREATE INDEX IF NOT EXISTS idx_mix_refs_job_id ON public.mix_refs (job_id);
CREATE INDEX IF NOT EXISTS idx_mix_refs_upload_id ON public.mix_refs (upload_id);

-- RLS設定（mix_refs）
ALTER TABLE public.mix_refs ENABLE ROW LEVEL SECURITY;

-- mix_refsのRLSポリシー
DROP POLICY IF EXISTS "Users can manage their own mix references" ON public.mix_refs;
CREATE POLICY "Users can manage their own mix references" 
  ON public.mix_refs 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = mix_refs.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mix_refs_updated_at ON public.mix_refs;
-- mix_refsのupdated_atトリガー
DO $$ BEGIN
    CREATE TRIGGER update_mix_refs_updated_at 
        BEFORE UPDATE ON public.mix_refs 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 20250904_v14_harmony_integration.sql
-- ========================================

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
DO $$ BEGIN
    CREATE TRIGGER harmony_apply_trigger
        AFTER UPDATE OF harmony_choice, harmony_level_db ON public.jobs
        FOR EACH ROW
        EXECUTE FUNCTION harmony_apply_trigger();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- ========================================
-- 20250904_v20_artifact_management.sql
-- ========================================

-- v2.0 アーティファクト管理システム
-- 3ステージのアーティファクト管理（prep/ai_ok/final）とTTL機能

-- 列挙型の追加
DO $$ BEGIN
    CREATE TYPE plan AS ENUM ('lite', 'standard', 'creator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE artifact_type AS ENUM ('prep', 'ai_ok', 'final');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- jobsテーブルにアーティファクト管理カラムを追加
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS plan plan NOT NULL DEFAULT 'lite',
ADD COLUMN IF NOT EXISTS prep_artifact_id uuid,
ADD COLUMN IF NOT EXISTS ai_ok_artifact_id uuid,
ADD COLUMN IF NOT EXISTS final_artifact_id uuid,
ADD COLUMN IF NOT EXISTS duration_s integer;

-- アーティファクト管理テーブル
CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind artifact_type NOT NULL,
  storage_path text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- TTL設定トリガー関数（プラン別期限）
CREATE OR REPLACE FUNCTION set_artifact_ttl()
RETURNS trigger AS $$
BEGIN
  SELECT
    CASE j.plan
      WHEN 'lite' THEN now() + INTERVAL '7 days'
      WHEN 'standard' THEN now() + INTERVAL '15 days'  
      WHEN 'creator' THEN now() + INTERVAL '30 days'
    END
  INTO NEW.expires_at
  FROM jobs j WHERE j.id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TTL設定トリガー
DROP TRIGGER IF EXISTS artifacts_set_ttl ON artifacts;
DO $$ BEGIN
    CREATE TRIGGER artifacts_set_ttl
        BEFORE INSERT ON artifacts
        FOR EACH ROW EXECUTE FUNCTION set_artifact_ttl();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_kind ON artifacts(kind);
CREATE INDEX IF NOT EXISTS idx_artifacts_expires_at ON artifacts(expires_at);

-- 外部キー制約を追加
DO $$ BEGIN
    ALTER TABLE jobs ADD CONSTRAINT fk_prep_artifact 
      FOREIGN KEY (prep_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE jobs ADD CONSTRAINT fk_ai_ok_artifact 
      FOREIGN KEY (ai_ok_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE jobs ADD CONSTRAINT fk_final_artifact 
      FOREIGN KEY (final_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLSポリシー設定
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- artifactsテーブルへのRLSポリシー（job経由でユーザーチェック）
CREATE POLICY "Users can access their own artifacts" ON artifacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = artifacts.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- 期限切れアーティファクトの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_artifacts()
RETURNS void AS $$
BEGIN
  -- 期限切れアーティファクトを削除
  DELETE FROM artifacts 
  WHERE expires_at < now();
  
  -- 対応するjobsのアーティファクト参照をクリア
  UPDATE jobs 
  SET prep_artifact_id = NULL 
  WHERE prep_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.prep_artifact_id
  );
  
  UPDATE jobs 
  SET ai_ok_artifact_id = NULL 
  WHERE ai_ok_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.ai_ok_artifact_id
  );
  
  UPDATE jobs 
  SET final_artifact_id = NULL 
  WHERE final_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.final_artifact_id
  );
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON TABLE artifacts IS '3ステージアーティファクト管理テーブル（prep/ai_ok/final）';
COMMENT ON COLUMN artifacts.kind IS 'アーティファクトの種類：prep（下ごしらえ）、ai_ok（AI仕上げ完了）、final（最終確認済み）';
COMMENT ON COLUMN artifacts.expires_at IS 'プラン別TTL：Lite 7日、Standard 15日、Creator 30日';
COMMENT ON FUNCTION set_artifact_ttl() IS 'アーティファクト作成時にプラン別TTLを自動設定';
COMMENT ON FUNCTION cleanup_expired_artifacts() IS '期限切れアーティファクトの自動削除（Edge Function or cron）';

-- ========================================
-- マイグレーション完了
-- ========================================

-- All MIXAI migrations have been successfully applied!
-- Tables created: jobs, plans, credit_ledger, subscriptions, mix_refs, application_logs, daily_harmony_stats, artifacts
-- Storage buckets: uta-uploads, uta-results
-- Ready for production use.