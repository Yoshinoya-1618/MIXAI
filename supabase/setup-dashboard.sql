-- ============================================
-- MIXAI Dashboard Supabase Setup Script
-- ============================================
-- このスクリプトをSupabase SQL Editorで実行してください

-- 1. 既存テーブルの拡張
-- ============================================

-- projectsテーブルに必要なカラムを追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Light' CHECK (plan IN ('Light', 'Standard', 'Creator'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPLOADED' CHECK (status IN (
  'UPLOADED', 'PREPPED', 'AI_MIX_OK', 'TWEAKING', 
  'MASTERING', 'REVIEW', 'DONE', 'ARCHIVED', 'EXPIRED'
));

-- 2. 新規テーブルの作成
-- ============================================

-- RemixSessionテーブル
CREATE TABLE IF NOT EXISTS remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  charged BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RemixSessionのインデックス
CREATE INDEX IF NOT EXISTS idx_remix_sessions_project_id ON remix_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_expires_at ON remix_sessions(expires_at);

-- イベントログテーブル
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- イベントログのインデックス
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_project_id ON event_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

-- ユーザークレジットテーブル
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クレジット取引履歴テーブル
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PURCHASE', 'REMIX', 'REFUND', 'BONUS', 'USAGE')),
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クレジット取引履歴のインデックス
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- 3. 自動更新トリガー
-- ============================================

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
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

-- 4. RLS (Row Level Security) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- projectsテーブルのポリシー
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- remix_sessionsテーブルのポリシー
DROP POLICY IF EXISTS "Users view own remix sessions" ON remix_sessions;
CREATE POLICY "Users view own remix sessions" 
  ON remix_sessions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own remix sessions" ON remix_sessions;
CREATE POLICY "Users create own remix sessions" 
  ON remix_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own remix sessions" ON remix_sessions;
CREATE POLICY "Users update own remix sessions" 
  ON remix_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- event_logsテーブルのポリシー
DROP POLICY IF EXISTS "Users view own event logs" ON event_logs;
CREATE POLICY "Users view own event logs" 
  ON event_logs FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create event logs" ON event_logs;
CREATE POLICY "Users create event logs" 
  ON event_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- user_creditsテーブルのポリシー
DROP POLICY IF EXISTS "Users view own credits" ON user_credits;
CREATE POLICY "Users view own credits" 
  ON user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- credit_transactionsテーブルのポリシー
DROP POLICY IF EXISTS "Users view own transactions" ON credit_transactions;
CREATE POLICY "Users view own transactions" 
  ON credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- 5. ヘルパー関数
-- ============================================

-- 期限切れプロジェクトのクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_expired_projects()
RETURNS void AS $$
DECLARE
  plan_days JSONB := '{"Light": 7, "Standard": 15, "Creator": 30}'::JSONB;
  project_record RECORD;
  days_limit INTEGER;
BEGIN
  FOR project_record IN 
    SELECT id, plan, created_at, user_id
    FROM projects 
    WHERE status NOT IN ('EXPIRED', 'ARCHIVED')
  LOOP
    days_limit := COALESCE((plan_days->>(project_record.plan))::INTEGER, 7);
    
    IF NOW() > project_record.created_at + INTERVAL '1 day' * days_limit THEN
      -- プロジェクトを期限切れに設定
      UPDATE projects 
      SET status = 'EXPIRED',
          updated_at = NOW()
      WHERE id = project_record.id;
      
      -- イベントログに記録
      INSERT INTO event_logs (user_id, project_id, event_type, details)
      VALUES (
        project_record.user_id,
        project_record.id,
        'AUTO_DELETE_EXPIRED',
        jsonb_build_object(
          'plan', project_record.plan,
          'createdAt', project_record.created_at,
          'expiredAt', NOW(),
          'daysLimit', days_limit
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 期限切れRemixSessionのクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_expired_remix_sessions()
RETURNS void AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- 期限切れセッションを取得して終了
  FOR session_record IN
    SELECT id, user_id, project_id, started_at, expires_at
    FROM remix_sessions
    WHERE expires_at < NOW()
      AND ended_at IS NULL
  LOOP
    -- セッションを終了
    UPDATE remix_sessions
    SET ended_at = NOW(),
        end_reason = 'EXPIRED'
    WHERE id = session_record.id;
    
    -- イベントログに記録
    INSERT INTO event_logs (user_id, project_id, event_type, details)
    VALUES (
      session_record.user_id,
      session_record.project_id,
      'REMIX_SESSION_ENDED',
      jsonb_build_object(
        'reason', 'EXPIRED',
        'sessionId', session_record.id,
        'startedAt', session_record.started_at,
        'expiredAt', session_record.expires_at
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- クレジット消費関数
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_project_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
  success BOOLEAN := false;
BEGIN
  -- 現在の残高を取得（ロック）
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- 残高チェック
  IF current_balance IS NOT NULL AND current_balance >= p_amount THEN
    -- クレジット消費
    UPDATE user_credits
    SET balance = balance - p_amount,
        total_used = total_used + p_amount
    WHERE user_id = p_user_id;
    
    -- 取引記録
    INSERT INTO credit_transactions (
      user_id, amount, type, description, 
      project_id, session_id
    ) VALUES (
      p_user_id, -p_amount, p_type, p_description,
      p_project_id, p_session_id
    );
    
    success := true;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;

-- 6. 新規ユーザー登録時の初期化
-- ============================================

-- 新規ユーザー登録時にクレジットを付与
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- デフォルトクレジットを付与（3.0クレジット）
  INSERT INTO user_credits (user_id, balance, total_purchased, total_used)
  VALUES (NEW.id, 3.0, 3.0, 0.0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- ウェルカムボーナスの記録
  IF NOT EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE user_id = NEW.id AND type = 'BONUS'
  ) THEN
    INSERT INTO credit_transactions (
      user_id, amount, type, description
    ) VALUES (
      NEW.id, 3.0, 'BONUS', 'Welcome bonus - 3 free credits'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 7. 統計ビュー
-- ============================================

-- システム統計ビュー
CREATE OR REPLACE VIEW system_stats AS
SELECT 
  COUNT(DISTINCT p.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN p.status NOT IN ('EXPIRED', 'ARCHIVED') THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN rs.ended_at IS NULL AND rs.expires_at > NOW() THEN rs.id END) as active_sessions,
  SUM(CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as projects_24h,
  SUM(CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as projects_7d
FROM projects p
LEFT JOIN remix_sessions rs ON p.id = rs.project_id;

-- クレジット統計ビュー
CREATE OR REPLACE VIEW credit_stats AS
SELECT 
  COUNT(*) as total_users,
  SUM(balance) as total_balance,
  AVG(balance) as avg_balance,
  MIN(balance) as min_balance,
  MAX(balance) as max_balance,
  COUNT(CASE WHEN balance = 0 THEN 1 END) as zero_balance_users,
  COUNT(CASE WHEN balance < 1 THEN 1 END) as low_balance_users,
  COUNT(CASE WHEN balance >= 10 THEN 1 END) as high_balance_users
FROM user_credits;

-- プロジェクト統計ビュー
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  status,
  plan,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_age_hours,
  MIN(created_at) as oldest_created,
  MAX(created_at) as newest_created
FROM projects
WHERE status != 'EXPIRED'
GROUP BY status, plan;

-- 8. サンプルデータ（開発環境用）
-- ============================================
-- 注意: 本番環境では実行しないでください

/*
-- テストユーザーの作成（開発環境のみ）
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- テストプロジェクトの作成
INSERT INTO projects (id, user_id, title, status, plan, created_at, updated_at)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'テストプロジェクト1', 'AI_MIX_OK', 'Standard', NOW() - INTERVAL '2 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'テストプロジェクト2', 'DONE', 'Light', NOW() - INTERVAL '5 days', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'テストプロジェクト3', 'TWEAKING', 'Creator', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT DO NOTHING;
*/

-- 9. 実行完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Dashboard setup completed successfully!';
  RAISE NOTICE 'Tables created: remix_sessions, event_logs, user_credits, credit_transactions';
  RAISE NOTICE 'RLS policies applied';
  RAISE NOTICE 'Helper functions created';
  RAISE NOTICE 'Please configure pg_cron for scheduled cleanup tasks';
END $$;