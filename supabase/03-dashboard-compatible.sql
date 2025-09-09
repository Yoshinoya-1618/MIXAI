-- ============================================
-- MIXAI ダッシュボード互換性対応スクリプト
-- ============================================
-- 既存のjobsテーブルを使用したダッシュボード機能の実装

-- 1. jobsテーブルに必要なカラムを追加
-- ============================================

-- ダッシュボード用のカラムを追加（存在しない場合のみ）
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS harmony_path TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- statusをダッシュボード用に拡張（既存のenumを変更）
DO $$ 
BEGIN
  -- 新しいステータスタイプを作成
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_extended') THEN
    CREATE TYPE job_status_extended AS ENUM (
      'uploaded', 'paid', 'processing', 'done', 'failed',
      'UPLOADED', 'PREPPED', 'AI_MIX_OK', 'TWEAKING', 
      'MASTERING', 'REVIEW', 'DONE', 'ARCHIVED', 'EXPIRED'
    );
  END IF;
END $$;

-- 2. projectsビューの作成（jobsテーブルのエイリアス）
-- ============================================

-- jobsテーブルをprojectsとして参照できるビューを作成
CREATE OR REPLACE VIEW projects AS
SELECT 
  id,
  user_id,
  COALESCE(title, 'Untitled Project') as title,
  CASE 
    WHEN status::text IN ('uploaded', 'UPLOADED') THEN 'UPLOADED'
    WHEN status::text = 'paid' THEN 'PREPPED'
    WHEN status::text = 'processing' THEN 'TWEAKING'
    WHEN status::text IN ('done', 'DONE') THEN 'DONE'
    WHEN status::text = 'failed' THEN 'FAILED'
    ELSE UPPER(status::text)
  END as status,
  COALESCE(plan_code, 'lite') as plan,
  instrumental_path,
  vocal_path,
  harmony_path,
  result_path,
  checkpoints,
  thumbnail_url,
  settings,
  metadata,
  created_at,
  updated_at
FROM public.jobs;

-- projectsビューに対するRLSポリシー
GRANT SELECT ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- 3. RemixSessionテーブル（job_idを使用）
-- ============================================

CREATE TABLE IF NOT EXISTS remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  project_id UUID GENERATED ALWAYS AS (job_id) STORED, -- 互換性のため
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  charged BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT CHECK (end_reason IN ('COMPLETED', 'EXPIRED', 'USER_ENDED', 'ERROR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_remix_sessions_job_id ON remix_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_expires_at ON remix_sessions(expires_at);

-- 4. イベントログテーブル（job_idを使用）
-- ============================================

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  project_id UUID GENERATED ALWAYS AS (job_id) STORED, -- 互換性のため
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_category TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_job_id ON event_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

-- 5. ユーザークレジットテーブル（既存のcredit_ledgerと連携）
-- ============================================

CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_refunded DECIMAL(10, 2) NOT NULL DEFAULT 0,
  bonus_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  bonus_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のcredit_ledgerからbalanceを計算する関数
CREATE OR REPLACE FUNCTION sync_user_credits_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance DECIMAL;
BEGIN
  -- credit_ledgerから現在の残高を計算
  SELECT COALESCE(SUM(credits), 0) INTO new_balance
  FROM public.credit_ledger
  WHERE user_id = NEW.user_id;
  
  -- user_creditsを更新または挿入
  INSERT INTO user_credits (user_id, balance)
  VALUES (NEW.user_id, new_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = new_balance,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- credit_ledgerにトリガーを設定
CREATE TRIGGER sync_credits_after_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_ledger
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_credits_balance();

-- 6. クレジット取引履歴（credit_ledgerの拡張ビュー）
-- ============================================

CREATE OR REPLACE VIEW credit_transactions AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN event = 'consume' THEN -ABS(credits)
    ELSE credits
  END as amount,
  event::text as type,
  reason as description,
  job_id,
  job_id as project_id, -- 互換性のため
  NULL::UUID as session_id,
  jsonb_build_object(
    'event', event,
    'original_amount', credits,
    'reason', reason
  ) as metadata,
  created_at
FROM public.credit_ledger;

-- 7. 通知テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  project_id UUID GENERATED ALWAYS AS (job_id) STORED, -- 互換性のため
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 8. RLS設定
-- ============================================

ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- remix_sessionsのポリシー
CREATE POLICY "Users view own remix sessions" 
  ON remix_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own remix sessions" 
  ON remix_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own remix sessions" 
  ON remix_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- event_logsのポリシー
CREATE POLICY "Users view own event logs" 
  ON event_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users create event logs" 
  ON event_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- user_creditsのポリシー
CREATE POLICY "Users view own credits" 
  ON user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- notificationsのポリシー
CREATE POLICY "Users view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- 9. ヘルパー関数
-- ============================================

-- 期限切れプロジェクトのクリーンアップ（jobsテーブル用）
CREATE OR REPLACE FUNCTION cleanup_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
  plan_days JSONB := '{"lite": 7, "standard": 15, "creator": 30}'::JSONB;
  job_record RECORD;
  days_limit INTEGER;
  expired_count INTEGER := 0;
BEGIN
  FOR job_record IN 
    SELECT id, plan_code, created_at, user_id
    FROM public.jobs 
    WHERE status NOT IN ('failed', 'done')
  LOOP
    days_limit := COALESCE((plan_days->>(COALESCE(job_record.plan_code, 'lite')))::INTEGER, 7);
    
    IF NOW() > job_record.created_at + INTERVAL '1 day' * days_limit THEN
      -- ジョブを失敗に設定
      UPDATE public.jobs 
      SET status = 'failed',
          error = 'Expired',
          updated_at = NOW()
      WHERE id = job_record.id;
      
      -- イベントログに記録
      INSERT INTO event_logs (user_id, job_id, event_type, event_category, details)
      VALUES (
        job_record.user_id,
        job_record.id,
        'AUTO_DELETE_EXPIRED',
        'SYSTEM',
        jsonb_build_object(
          'plan', job_record.plan_code,
          'createdAt', job_record.created_at,
          'expiredAt', NOW(),
          'daysLimit', days_limit
        )
      );
      
      expired_count := expired_count + 1;
    END IF;
  END LOOP;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 期限切れRemixSessionのクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_expired_remix_sessions()
RETURNS INTEGER AS $$
DECLARE
  session_record RECORD;
  expired_count INTEGER := 0;
BEGIN
  FOR session_record IN
    SELECT id, user_id, job_id, started_at, expires_at
    FROM remix_sessions
    WHERE expires_at < NOW()
      AND ended_at IS NULL
  LOOP
    UPDATE remix_sessions
    SET ended_at = NOW(),
        end_reason = 'EXPIRED'
    WHERE id = session_record.id;
    
    INSERT INTO event_logs (user_id, job_id, session_id, event_type, event_category, details)
    VALUES (
      session_record.user_id,
      session_record.job_id,
      session_record.id,
      'REMIX_SESSION_ENDED',
      'SYSTEM',
      jsonb_build_object(
        'reason', 'EXPIRED',
        'sessionId', session_record.id,
        'startedAt', session_record.started_at,
        'expiredAt', session_record.expires_at
      )
    );
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- クレジット消費関数（credit_ledgerを使用）
CREATE OR REPLACE FUNCTION consume_credits_ledger(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_job_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL;
  success BOOLEAN := false;
  transaction_id UUID;
BEGIN
  -- 現在の残高を取得
  SELECT COALESCE(SUM(credits), 0) INTO current_balance
  FROM public.credit_ledger
  WHERE user_id = p_user_id;
  
  -- 残高チェック
  IF current_balance >= p_amount THEN
    -- クレジット消費を記録
    INSERT INTO public.credit_ledger (
      user_id, event, credits, reason, job_id
    ) VALUES (
      p_user_id, 'consume', -p_amount, p_reason, p_job_id
    )
    RETURNING id INTO transaction_id;
    
    success := true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', success,
    'transactionId', transaction_id,
    'previousBalance', current_balance,
    'newBalance', current_balance - CASE WHEN success THEN p_amount ELSE 0 END,
    'amountCharged', CASE WHEN success THEN p_amount ELSE 0 END,
    'insufficientFunds', NOT success
  );
END;
$$ LANGUAGE plpgsql;

-- 10. 初期データの同期
-- ============================================

-- 既存のcredit_ledgerデータからuser_creditsを初期化
INSERT INTO user_credits (user_id, balance)
SELECT 
  user_id,
  COALESCE(SUM(credits), 0) as balance
FROM public.credit_ledger
GROUP BY user_id
ON CONFLICT (user_id) 
DO UPDATE SET 
  balance = EXCLUDED.balance,
  updated_at = NOW();

-- 新規ユーザー用のウェルカムボーナス
CREATE OR REPLACE FUNCTION handle_new_user_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  -- デフォルトクレジットを付与（3.0クレジット）
  INSERT INTO public.credit_ledger (
    user_id, event, credits, reason
  )
  VALUES (
    NEW.id, 'grant', 3.0, 'Welcome bonus'
  );
  
  -- ウェルカム通知
  INSERT INTO notifications (
    user_id, type, title, message
  ) VALUES (
    NEW.id, 'WELCOME', 'MIXAIへようこそ！',
    '無料クレジット3.0が付与されました。早速AIミキシングを試してみましょう！'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
DROP TRIGGER IF EXISTS on_auth_user_created_dashboard ON auth.users;
CREATE TRIGGER on_auth_user_created_dashboard
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_dashboard();

-- 11. 統計ビュー
-- ============================================

-- ダッシュボード統計ビュー
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  j.user_id,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN j.status NOT IN ('failed') THEN 1 END) as active_projects,
  COUNT(CASE WHEN j.status = 'done' THEN 1 END) as completed_projects,
  COUNT(CASE WHEN j.status = 'processing' THEN 1 END) as in_progress,
  SUM(CASE WHEN j.created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as projects_24h
FROM public.jobs j
GROUP BY j.user_id;

-- 12. 実行完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Dashboard compatibility setup completed!';
  RAISE NOTICE 'Created: projects view, remix_sessions, event_logs, user_credits, notifications';
  RAISE NOTICE 'Integrated with existing: jobs table, credit_ledger table';
  RAISE NOTICE '';
  RAISE NOTICE 'The dashboard is now compatible with your existing database structure!';
END $$;