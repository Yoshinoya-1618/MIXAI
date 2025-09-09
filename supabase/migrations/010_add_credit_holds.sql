-- ================================================
-- Credit holds table for reservation system
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- クレジットホールドテーブルの作成
CREATE TABLE IF NOT EXISTS credit_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('held', 'consumed', 'released')) DEFAULT 'held',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  released_at TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_credit_holds_user_id ON credit_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_holds_job_id ON credit_holds(job_id);
CREATE INDEX IF NOT EXISTS idx_credit_holds_status ON credit_holds(status);
CREATE INDEX IF NOT EXISTS idx_credit_holds_expires_at ON credit_holds(expires_at);

-- RLSポリシー
ALTER TABLE credit_holds ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のホールドのみ閲覧可能
CREATE POLICY credit_holds_select_own ON credit_holds
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のホールドのみ作成可能
CREATE POLICY credit_holds_insert_own ON credit_holds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のホールドのみ更新可能
CREATE POLICY credit_holds_update_own ON credit_holds
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 期限切れホールドを自動解放する関数
CREATE OR REPLACE FUNCTION release_expired_holds()
RETURNS void AS $$
BEGIN
  UPDATE credit_holds
  SET 
    status = 'released',
    released_at = NOW()
  WHERE 
    status = 'held'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- クレジット残高を計算するビューの更新（ホールド分を考慮）
CREATE OR REPLACE VIEW user_credits_available AS
SELECT 
  cl.user_id,
  COALESCE(SUM(cl.amount), 0) as total_credits,
  COALESCE(SUM(CASE WHEN cl.bucket = 'trial' THEN cl.amount ELSE 0 END), 0) as trial_credits,
  COALESCE(SUM(CASE WHEN cl.bucket = 'monthly' THEN cl.amount ELSE 0 END), 0) as monthly_credits,
  COALESCE(SUM(CASE WHEN cl.bucket = 'addon' THEN cl.amount ELSE 0 END), 0) as addon_credits,
  COALESCE(SUM(CASE WHEN cl.bucket = 'carryover' THEN cl.amount ELSE 0 END), 0) as carryover_credits,
  -- ホールド中のクレジットを差し引いた利用可能残高
  COALESCE(SUM(cl.amount), 0) - COALESCE(
    (SELECT SUM(amount) FROM credit_holds 
     WHERE user_id = cl.user_id AND status = 'held'),
    0
  ) as available_credits,
  MAX(cl.created_at) as last_transaction_at
FROM credit_ledger cl
GROUP BY cl.user_id;