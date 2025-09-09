-- ================================================
-- Add freetrial and prepaid plans
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- freetrialプランの追加（7日間無料トライアル）
INSERT INTO plans (code, name, price_jpy, monthly_credits, storage_days, features) VALUES
  ('freetrial', '無料トライアル', 0, 1.0, 7,
   '{"max_duration": 180, "max_file_mb": 100, "advanced_features": true, "priority_processing": true, "trial": true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_jpy = EXCLUDED.price_jpy,
  monthly_credits = EXCLUDED.monthly_credits,
  storage_days = EXCLUDED.storage_days,
  features = EXCLUDED.features,
  updated_at = NOW();

-- prepaidプラン（都度購入）の追加
INSERT INTO plans (code, name, price_jpy, monthly_credits, storage_days, features) VALUES
  ('prepaid', '都度購入', 0, 0.0, 7,
   '{"max_duration": 60, "max_file_mb": 50, "advanced_features": false, "prepaid": true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_jpy = EXCLUDED.price_jpy,
  monthly_credits = EXCLUDED.monthly_credits,
  storage_days = EXCLUDED.storage_days,
  features = EXCLUDED.features,
  updated_at = NOW();

-- profilesテーブルにトライアル開始日を追加（存在しない場合）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_consumed BOOLEAN DEFAULT FALSE;

-- クレジットパックマスタテーブルの作成
CREATE TABLE IF NOT EXISTS credit_packs (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits DECIMAL(10,2) NOT NULL,
  price_jpy INTEGER NOT NULL,
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- クレジットパックデータの挿入
INSERT INTO credit_packs (code, name, credits, price_jpy, description) VALUES
  ('mini', 'ミニパック', 2.0, 1580, '2クレジット（@¥790/C）'),
  ('small', 'スモールパック', 5.0, 3800, '5クレジット（@¥760/C）'),
  ('medium', 'ミディアムパック', 8.0, 5920, '8クレジット（@¥740/C）'),
  ('large', 'ラージパック', 12.0, 8400, '12クレジット（@¥700/C）')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_jpy = EXCLUDED.price_jpy,
  description = EXCLUDED.description,
  updated_at = NOW();

-- トリガーの作成
DROP TRIGGER IF EXISTS update_credit_packs_updated_at ON credit_packs;
CREATE TRIGGER update_credit_packs_updated_at BEFORE UPDATE ON credit_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ユーザー登録時にfreetrialプランを付与する関数
CREATE OR REPLACE FUNCTION assign_freetrial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーにfreetrialプランを付与
  INSERT INTO subscriptions (
    user_id,
    plan_code,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'freetrial',
    'trialing',
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW() + INTERVAL '7 days'
  );
  
  -- トライアル開始日を記録
  UPDATE profiles 
  SET 
    trial_started_at = NOW(),
    trial_consumed = FALSE
  WHERE id = NEW.id;
  
  -- 無償1クレジットを付与
  INSERT INTO credit_ledger (
    user_id,
    amount,
    balance_after,
    type,
    bucket,
    description
  ) VALUES (
    NEW.id,
    1.0,
    1.0,
    'grant',
    'trial',
    '無料トライアル特典（1クレジット）'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auth.usersテーブルへの新規登録時のトリガー
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION assign_freetrial_on_signup();

-- トライアル期限切れを処理する関数
CREATE OR REPLACE FUNCTION process_expired_trials()
RETURNS void AS $$
BEGIN
  -- 期限切れのトライアルをprepaidに移行
  UPDATE subscriptions
  SET 
    plan_code = 'prepaid',
    status = 'none',
    trial_ends_at = NULL,
    updated_at = NOW()
  WHERE 
    plan_code = 'freetrial' 
    AND trial_ends_at < NOW()
    AND status = 'trialing';
  
  -- トライアルクレジットを失効
  INSERT INTO credit_ledger (user_id, amount, balance_after, type, bucket, description)
  SELECT 
    s.user_id,
    -uc.trial_credits,
    uc.total_credits - uc.trial_credits,
    'expire',
    'trial',
    '無料トライアル期限切れ'
  FROM subscriptions s
  JOIN user_credits uc ON s.user_id = uc.user_id
  WHERE 
    s.plan_code = 'prepaid'
    AND s.updated_at >= NOW() - INTERVAL '1 minute'
    AND uc.trial_credits > 0;
    
  -- プロファイルのトライアル消費フラグを更新
  UPDATE profiles
  SET trial_consumed = TRUE
  WHERE id IN (
    SELECT user_id 
    FROM subscriptions 
    WHERE plan_code = 'prepaid' 
    AND updated_at >= NOW() - INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql;

-- 定期的にトライアル期限切れを処理するcronジョブ（pg_cronが必要）
-- SELECT cron.schedule('process-expired-trials', '0 * * * *', 'SELECT process_expired_trials();');