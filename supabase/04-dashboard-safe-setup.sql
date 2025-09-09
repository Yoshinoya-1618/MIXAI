-- ============================================
-- MIXAI ダッシュボード セーフセットアップ
-- ============================================
-- 既存のテーブル構造を確認しながら安全に設定

-- 0. 既存のテーブル構造を確認
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Checking existing table structure...';
  
  -- jobsテーブルのカラムを確認
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'jobs'
  ) THEN
    RAISE NOTICE 'Table "jobs" exists';
  ELSE
    RAISE NOTICE 'Table "jobs" does not exist - please run initial migration first';
  END IF;
END $$;

-- 1. jobsテーブルに必要なカラムを安全に追加
-- ============================================

-- titleカラムを追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN title TEXT;
    RAISE NOTICE 'Added column: title';
  END IF;
END $$;

-- checkpointsカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'checkpoints'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN checkpoints JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: checkpoints';
  END IF;
END $$;

-- thumbnail_urlカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE 'Added column: thumbnail_url';
  END IF;
END $$;

-- harmony_pathカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'harmony_path'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN harmony_path TEXT;
    RAISE NOTICE 'Added column: harmony_path';
  END IF;
END $$;

-- settingsカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN settings JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: settings';
  END IF;
END $$;

-- metadataカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: metadata';
  END IF;
END $$;

-- plan_codeカラムが存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'plan_code'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN plan_code TEXT DEFAULT 'lite';
    RAISE NOTICE 'Added column: plan_code';
  END IF;
END $$;

-- 2. projectsビューの作成（既存のカラムのみ使用）
-- ============================================

-- 既存のビューを削除
DROP VIEW IF EXISTS projects CASCADE;

-- jobsテーブルの実際のカラムに基づいてビューを作成
CREATE VIEW projects AS
SELECT 
  j.id,
  j.user_id,
  COALESCE(j.title, 'Untitled Project') as title,
  CASE 
    WHEN j.status::text IN ('uploaded', 'UPLOADED') THEN 'UPLOADED'
    WHEN j.status::text = 'paid' THEN 'PREPPED'
    WHEN j.status::text = 'processing' THEN 'TWEAKING'
    WHEN j.status::text IN ('done', 'DONE') THEN 'DONE'
    WHEN j.status::text = 'failed' THEN 'FAILED'
    ELSE UPPER(j.status::text)
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs' 
      AND column_name = 'plan_code'
    ) THEN COALESCE(j.plan_code, 'lite')
    ELSE 'lite'
  END as plan,
  j.instrumental_path,
  j.vocal_path,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs' 
      AND column_name = 'harmony_path'
    ) THEN j.harmony_path
    ELSE NULL
  END as harmony_path,
  j.result_path,
  COALESCE(j.checkpoints, '{}'::jsonb) as checkpoints,
  j.thumbnail_url,
  COALESCE(j.settings, '{}'::jsonb) as settings,
  COALESCE(j.metadata, '{}'::jsonb) as metadata,
  j.created_at,
  j.updated_at
FROM public.jobs j;

-- ビューへの権限付与
GRANT SELECT ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- 3. RemixSessionテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  charged BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT CHECK (end_reason IN ('COMPLETED', 'EXPIRED', 'USER_ENDED', 'ERROR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- project_idを仮想カラムとして追加（互換性のため）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'remix_sessions' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE remix_sessions 
    ADD COLUMN project_id UUID GENERATED ALWAYS AS (job_id) STORED;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_remix_sessions_job_id ON remix_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_expires_at ON remix_sessions(expires_at);

-- 4. イベントログテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_category TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- project_idを仮想カラムとして追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'event_logs' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE event_logs 
    ADD COLUMN project_id UUID GENERATED ALWAYS AS (job_id) STORED;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_job_id ON event_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

-- 5. ユーザークレジットテーブル
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

-- 6. 通知テーブル
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
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- project_idを仮想カラムとして追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN project_id UUID GENERATED ALWAYS AS (job_id) STORED;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 7. credit_transactionsビュー（credit_ledgerのラッパー）
-- ============================================

-- credit_ledgerテーブルが存在する場合のみ作成
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credit_ledger'
  ) THEN
    -- ビューを作成
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
      job_id as project_id,
      NULL::UUID as session_id,
      jsonb_build_object(
        'event', event,
        'original_amount', credits,
        'reason', reason
      ) as metadata,
      created_at
    FROM public.credit_ledger;
    
    RAISE NOTICE 'Created view: credit_transactions';
  ELSE
    RAISE NOTICE 'Table credit_ledger does not exist, skipping credit_transactions view';
  END IF;
END $$;

-- 8. RLS設定
-- ============================================

ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（存在しない場合のみ作成）
DO $$
BEGIN
  -- remix_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'remix_sessions' 
    AND policyname = 'Users view own remix sessions'
  ) THEN
    CREATE POLICY "Users view own remix sessions" 
      ON remix_sessions FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'remix_sessions' 
    AND policyname = 'Users create own remix sessions'
  ) THEN
    CREATE POLICY "Users create own remix sessions" 
      ON remix_sessions FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  -- event_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_logs' 
    AND policyname = 'Users view own event logs'
  ) THEN
    CREATE POLICY "Users view own event logs" 
      ON event_logs FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  -- user_credits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_credits' 
    AND policyname = 'Users view own credits'
  ) THEN
    CREATE POLICY "Users view own credits" 
      ON user_credits FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users view own notifications'
  ) THEN
    CREATE POLICY "Users view own notifications" 
      ON notifications FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. ヘルパー関数（更新されたバージョン）
-- ============================================

-- updated_atの自動更新（存在しない場合のみ）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
DROP TRIGGER IF EXISTS update_remix_sessions_updated_at ON remix_sessions;
CREATE TRIGGER update_remix_sessions_updated_at
  BEFORE UPDATE ON remix_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- credit_ledgerとuser_creditsの同期
CREATE OR REPLACE FUNCTION sync_user_credits_from_ledger()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  new_balance DECIMAL;
BEGIN
  -- 対象ユーザーIDを取得
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- credit_ledgerから現在の残高を計算
  SELECT COALESCE(SUM(credits), 0) INTO new_balance
  FROM public.credit_ledger
  WHERE user_id = target_user_id;
  
  -- user_creditsを更新または挿入
  INSERT INTO user_credits (user_id, balance)
  VALUES (target_user_id, new_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = new_balance,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- credit_ledgerが存在する場合のみトリガーを設定
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credit_ledger'
  ) THEN
    DROP TRIGGER IF EXISTS sync_credits_after_ledger_change ON public.credit_ledger;
    CREATE TRIGGER sync_credits_after_ledger_change
      AFTER INSERT OR UPDATE OR DELETE ON public.credit_ledger
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_credits_from_ledger();
    
    -- 既存のデータを同期
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
    
    RAISE NOTICE 'Synced user_credits with credit_ledger';
  END IF;
END $$;

-- 10. 統計ビュー
-- ============================================

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

-- 11. 完了メッセージ
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
BEGIN
  -- テーブル数を確認
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('remix_sessions', 'event_logs', 'user_credits', 'notifications');
  
  -- ビュー数を確認
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'credit_transactions', 'dashboard_stats');
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Dashboard setup completed!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Tables created: % / 4', table_count;
  RAISE NOTICE 'Views created: % / 3', view_count;
  RAISE NOTICE '';
  RAISE NOTICE 'The dashboard is now ready to use!';
  RAISE NOTICE '====================================';
END $$;