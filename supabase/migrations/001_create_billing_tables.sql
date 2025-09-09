-- ================================================
-- MIXAI Billing System Tables
-- Version: 1.0.0
-- Date: 2025-01-07
-- ================================================

-- ================================================
-- プランマスタテーブル
-- ================================================
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_jpy INTEGER NOT NULL,
  monthly_credits DECIMAL(10,2) NOT NULL,
  storage_days INTEGER NOT NULL,
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT UNIQUE,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- プランデータの挿入（Stripe価格IDは後で更新）
INSERT INTO plans (code, name, price_jpy, monthly_credits, storage_days, stripe_product_id, features) VALUES
  ('lite', 'Lite', 1280, 3.0, 7, 'prod_T0c5Yt8AdUKkTA', 
   '{"max_duration": 60, "max_file_mb": 20, "advanced_features": false}'::jsonb),
  ('standard', 'Standard', 2980, 6.0, 15, 'prod_T0c6S3RRz9YdUb',
   '{"max_duration": 120, "max_file_mb": 50, "advanced_features": true}'::jsonb),
  ('creator', 'Creator', 5980, 10.0, 30, 'prod_T0c6iHayaOKCJx',
   '{"max_duration": 180, "max_file_mb": 100, "advanced_features": true, "priority_processing": true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ================================================
-- ジョブテーブル（既存テーブルの確認）
-- ================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- サブスクリプション管理テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_code TEXT REFERENCES plans(code),
  status TEXT CHECK (status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  billing_cycle_anchor TIMESTAMP, -- 加入日（更新基準日）
  trial_ends_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- ================================================
-- Stripe顧客情報テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_billing_customers_stripe_customer_id ON billing_customers(stripe_customer_id);

-- ================================================
-- クレジット台帳テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  type TEXT CHECK (type IN ('grant', 'consume', 'purchase', 'expire', 'refund')),
  bucket TEXT CHECK (bucket IN ('trial', 'monthly', 'carryover', 'addon')),
  description TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON credit_ledger(type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_bucket ON credit_ledger(bucket);

-- ================================================
-- 請求書管理テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL, -- 金額（円）
  currency TEXT DEFAULT 'jpy',
  status TEXT,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON billing_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe_invoice_id ON billing_invoices(stripe_invoice_id);

-- ================================================
-- Webhookイベントログ（冪等性保証）
-- ================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed);

-- ================================================
-- アラートテーブル（監視用）
-- ================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- 現在のクレジット残高を計算するビュー
-- ================================================
CREATE OR REPLACE VIEW user_credits AS
SELECT 
  user_id,
  COALESCE(SUM(amount), 0) as total_credits,
  COALESCE(SUM(CASE WHEN bucket = 'trial' THEN amount ELSE 0 END), 0) as trial_credits,
  COALESCE(SUM(CASE WHEN bucket = 'monthly' THEN amount ELSE 0 END), 0) as monthly_credits,
  COALESCE(SUM(CASE WHEN bucket = 'addon' THEN amount ELSE 0 END), 0) as addon_credits,
  COALESCE(SUM(CASE WHEN bucket = 'carryover' THEN amount ELSE 0 END), 0) as carryover_credits,
  MAX(created_at) as last_transaction_at
FROM credit_ledger
GROUP BY user_id;

-- ================================================
-- トリガー関数：updated_atの自動更新
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billing_customers_updated_at ON billing_customers;
CREATE TRIGGER update_billing_customers_updated_at BEFORE UPDATE ON billing_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- クレジット異常消費の検知トリガー
-- ================================================
CREATE OR REPLACE FUNCTION check_credit_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount < -10 THEN
    -- 10クレジット以上の消費を検知
    INSERT INTO alerts (type, message, metadata)
    VALUES ('credit_anomaly', 'Large credit consumption detected', 
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_anomaly_check ON credit_ledger;
CREATE TRIGGER credit_anomaly_check
AFTER INSERT ON credit_ledger
FOR EACH ROW EXECUTE FUNCTION check_credit_anomaly();