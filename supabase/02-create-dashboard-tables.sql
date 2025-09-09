-- ============================================
-- MIXAI ダッシュボード関連テーブル作成スクリプト
-- ============================================
-- 前提: 01-create-base-tables.sql を実行済みであること

-- 1. RemixSessionテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_remix_sessions_project_id ON remix_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_expires_at ON remix_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_remix_sessions_active 
  ON remix_sessions(expires_at, ended_at) 
  WHERE ended_at IS NULL;

-- 2. イベントログテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  
  -- イベント情報
  event_type TEXT NOT NULL,
  event_category TEXT,
  details JSONB DEFAULT '{}',
  
  -- クライアント情報
  ip_address INET,
  user_agent TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_project_id ON event_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

-- 3. ユーザークレジットテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_refunded DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- ボーナスクレジット
  bonus_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  bonus_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. クレジット取引履歴テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 取引情報
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2),
  type TEXT NOT NULL CHECK (type IN (
    'PURCHASE', 'USAGE', 'REFUND', 'BONUS', 'REMIX', 'ADJUSTMENT'
  )),
  status TEXT DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'cancelled'
  )),
  
  -- 関連情報
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  
  -- 支払い情報（購入時）
  payment_method TEXT,
  payment_id TEXT,
  
  -- メタデータ
  metadata JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- 5. 通知テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通知内容
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  
  -- ステータス
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- 関連情報
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 6. 自動更新トリガー
-- ============================================

-- remix_sessionsの更新トリガー
CREATE TRIGGER update_remix_sessions_updated_at
  BEFORE UPDATE ON remix_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- user_creditsの更新トリガー
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. RLS (Row Level Security) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
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

-- credit_transactionsのポリシー
CREATE POLICY "Users view own transactions" 
  ON credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- notificationsのポリシー
CREATE POLICY "Users view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- 8. ヘルパー関数
-- ============================================

-- 期限切れプロジェクトのクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_expired_projects()
RETURNS INTEGER AS $$
DECLARE
  plan_days JSONB := '{"Light": 7, "Standard": 15, "Creator": 30}'::JSONB;
  project_record RECORD;
  days_limit INTEGER;
  expired_count INTEGER := 0;
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
      INSERT INTO event_logs (user_id, project_id, event_type, event_category, details)
      VALUES (
        project_record.user_id,
        project_record.id,
        'AUTO_DELETE_EXPIRED',
        'SYSTEM',
        jsonb_build_object(
          'plan', project_record.plan,
          'createdAt', project_record.created_at,
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
    INSERT INTO event_logs (user_id, project_id, session_id, event_type, event_category, details)
    VALUES (
      session_record.user_id,
      session_record.project_id,
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

-- クレジット消費関数
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_project_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
  success BOOLEAN := false;
  transaction_id UUID;
BEGIN
  -- トランザクション開始（暗黙的）
  
  -- 現在の残高を取得（行ロック）
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- ユーザーが存在しない場合は初期化
  IF current_balance IS NULL THEN
    INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;
  
  -- 残高チェック
  IF current_balance >= p_amount THEN
    -- クレジット消費
    new_balance := current_balance - p_amount;
    
    UPDATE user_credits
    SET balance = new_balance,
        total_used = total_used + p_amount
    WHERE user_id = p_user_id;
    
    -- 取引記録
    INSERT INTO credit_transactions (
      user_id, amount, balance_after, type, 
      description, project_id, session_id
    ) VALUES (
      p_user_id, -p_amount, new_balance, p_type, 
      p_description, p_project_id, p_session_id
    )
    RETURNING id INTO transaction_id;
    
    success := true;
  ELSE
    new_balance := current_balance;
  END IF;
  
  -- 結果を返す
  RETURN jsonb_build_object(
    'success', success,
    'transactionId', transaction_id,
    'previousBalance', current_balance,
    'newBalance', new_balance,
    'amountCharged', CASE WHEN success THEN p_amount ELSE 0 END,
    'insufficientFunds', NOT success
  );
END;
$$ LANGUAGE plpgsql;

-- クレジット追加関数
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
  transaction_id UUID;
BEGIN
  -- 現在の残高を取得（初期化も含む）
  INSERT INTO user_credits (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- クレジット追加
  new_balance := current_balance + p_amount;
  
  UPDATE user_credits
  SET balance = new_balance,
      total_purchased = total_purchased + p_amount
  WHERE user_id = p_user_id;
  
  -- 取引記録
  INSERT INTO credit_transactions (
    user_id, amount, balance_after, type, 
    description, payment_id
  ) VALUES (
    p_user_id, p_amount, new_balance, p_type, 
    p_description, p_payment_id
  )
  RETURNING id INTO transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transactionId', transaction_id,
    'previousBalance', current_balance,
    'newBalance', new_balance,
    'amountAdded', p_amount
  );
END;
$$ LANGUAGE plpgsql;

-- 9. 新規ユーザー用の初期設定
-- ============================================

-- 新規ユーザー登録時にクレジットを付与
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- デフォルトクレジットを付与（3.0クレジット）
  INSERT INTO user_credits (
    user_id, balance, bonus_balance, 
    total_purchased, total_used
  )
  VALUES (
    NEW.id, 3.0, 3.0, 3.0, 0.0
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- ウェルカムボーナスの記録
  IF NOT EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE user_id = NEW.id AND type = 'BONUS'
  ) THEN
    INSERT INTO credit_transactions (
      user_id, amount, balance_after, type, description
    ) VALUES (
      NEW.id, 3.0, 3.0, 'BONUS', 'Welcome bonus - 3 free credits'
    );
    
    -- ウェルカム通知
    INSERT INTO notifications (
      user_id, type, title, message
    ) VALUES (
      NEW.id, 'WELCOME', 'MIXAIへようこそ！',
      '無料クレジット3.0が付与されました。早速AIミキシングを試してみましょう！'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_credits();

-- 10. 統計ビュー
-- ============================================

-- プロジェクト統計ビュー
CREATE OR REPLACE VIEW project_dashboard_stats AS
SELECT 
  p.user_id,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN p.status NOT IN ('EXPIRED', 'ARCHIVED') THEN 1 END) as active_projects,
  COUNT(CASE WHEN p.status = 'DONE' THEN 1 END) as completed_projects,
  COUNT(CASE WHEN p.status IN ('PREPPED', 'TWEAKING', 'MASTERING', 'REVIEW') THEN 1 END) as in_progress,
  COUNT(CASE WHEN p.status = 'AI_MIX_OK' THEN 1 END) as ai_ok_projects,
  COUNT(CASE WHEN 
    p.created_at + INTERVAL '1 day' * 
    CASE p.plan 
      WHEN 'Light' THEN 7 
      WHEN 'Standard' THEN 15 
      WHEN 'Creator' THEN 30 
      ELSE 7 
    END > NOW() - INTERVAL '3 days'
    AND p.created_at + INTERVAL '1 day' * 
    CASE p.plan 
      WHEN 'Light' THEN 7 
      WHEN 'Standard' THEN 15 
      WHEN 'Creator' THEN 30 
      ELSE 7 
    END <= NOW()
    AND p.status NOT IN ('EXPIRED', 'ARCHIVED')
  THEN 1 END) as expiring_soon
FROM projects p
GROUP BY p.user_id;

-- 11. 実行完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Dashboard tables created successfully!';
  RAISE NOTICE 'Tables: remix_sessions, event_logs, user_credits, credit_transactions, notifications';
  RAISE NOTICE 'Functions: cleanup_expired_projects, cleanup_expired_remix_sessions, consume_credits, add_credits';
  RAISE NOTICE 'Views: project_dashboard_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'Setup complete! Your dashboard is ready to use.';
END $$;