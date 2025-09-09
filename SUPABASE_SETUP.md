# Supabase本番環境セットアップガイド

## 📋 Supabase本番環境の準備

### 1. Supabaseプロジェクトの確認
https://app.supabase.com/project/ebyuuufywvgghnsxdudi

現在のプロジェクト: `ebyuuufywvgghnsxdudi`

## 🗄️ データベーステーブルの作成

### 1. SQL Editorでテーブル作成

Supabase Dashboard → SQL Editor → New Query

```sql
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

-- プランデータの挿入（Stripe商品IDを後で更新）
INSERT INTO plans (code, name, price_jpy, monthly_credits, storage_days, stripe_product_id, stripe_price_id) VALUES
  ('lite', 'Lite', 1280, 3.0, 7, 'prod_T0c5Yt8AdUKkTA', 'price_xxxxx'),
  ('standard', 'Standard', 2980, 6.0, 15, 'prod_T0c6S3RRz9YdUb', 'price_xxxxx'),
  ('creator', 'Creator', 5980, 10.0, 30, 'prod_T0c6iHayaOKCJx', 'price_xxxxx')
ON CONFLICT (code) DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  updated_at = NOW();

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
  trial_ends_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

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
CREATE INDEX idx_billing_customers_stripe_customer_id ON billing_customers(stripe_customer_id);

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
CREATE INDEX idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_created_at ON credit_ledger(created_at DESC);
CREATE INDEX idx_credit_ledger_type ON credit_ledger(type);

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
CREATE INDEX idx_billing_invoices_user_id ON billing_invoices(user_id);
CREATE INDEX idx_billing_invoices_stripe_invoice_id ON billing_invoices(stripe_invoice_id);

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
CREATE INDEX idx_billing_events_type ON billing_events(type);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at DESC);

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
  MAX(created_at) as last_transaction_at
FROM credit_ledger
GROUP BY user_id;

-- ================================================
-- RLS (Row Level Security) ポリシー
-- ================================================

-- subscriptionsテーブル
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- billing_customersテーブル
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing info" ON billing_customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage billing customers" ON billing_customers
  FOR ALL USING (auth.role() = 'service_role');

-- credit_ledgerテーブル
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage credits" ON credit_ledger
  FOR ALL USING (auth.role() = 'service_role');

-- billing_invoicesテーブル
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON billing_invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage invoices" ON billing_invoices
  FOR ALL USING (auth.role() = 'service_role');

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
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_customers_updated_at BEFORE UPDATE ON billing_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔐 セキュリティ設定

### 1. 認証設定
```
Supabase Dashboard → Authentication → Providers

有効にする認証方法:
✅ Email
✅ Google OAuth (オプション)
✅ GitHub OAuth (オプション)
```

### 2. メール設定
```
Authentication → Email Templates

カスタマイズ推奨:
- Confirm signup (確認メール)
- Reset password (パスワードリセット)
- Magic Link (マジックリンク)
```

### 3. URLコンフィギュレーション
```
Authentication → URL Configuration

Site URL: https://[YOUR_DOMAIN].com
Redirect URLs:
- https://[YOUR_DOMAIN].com/auth/callback
- https://[YOUR_DOMAIN].com/auth/reset-password
```

## 🚀 Edge Functions（必要な場合）

### Webhookハンドラー
```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
    
    // イベント処理
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // ... イベント処理ロジック
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    )
  }
})
```

デプロイ:
```bash
supabase functions deploy stripe-webhook
```

## 📊 リアルタイム設定

### Realtimeを有効化
```sql
-- クレジット残高の変更をリアルタイムで監視
ALTER PUBLICATION supabase_realtime ADD TABLE credit_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
```

## 🔄 バックアップ設定

### 1. 自動バックアップ
```
Supabase Dashboard → Settings → Database

Point-in-time Recovery: 有効
バックアップ頻度: Daily
保持期間: 30日
```

### 2. 手動バックアップスクリプト
```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
```

## 📈 モニタリング設定

### 1. ログ設定
```
Supabase Dashboard → Logs

監視対象:
- Auth logs
- Database logs  
- API logs
- Edge Function logs
```

### 2. アラート設定
```sql
-- クレジット異常消費の検知
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

CREATE TRIGGER credit_anomaly_check
AFTER INSERT ON credit_ledger
FOR EACH ROW EXECUTE FUNCTION check_credit_anomaly();
```

## ✅ デプロイ前チェックリスト

- [ ] 全テーブルが作成されている
- [ ] RLSポリシーが設定されている
- [ ] インデックスが作成されている
- [ ] 認証プロバイダーが設定されている
- [ ] URLコンフィギュレーションが正しい
- [ ] バックアップが有効
- [ ] Service Roleキーが環境変数に設定されている

## 🔧 環境変数の更新

`.env.production`に以下を確認:
```bash
# Supabase（既に設定済み）
NEXT_PUBLIC_SUPABASE_URL=https://ebyuuufywvgghnsxdudi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# データベース接続
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.ebyuuufywvgghnsxdudi.supabase.co:5432/postgres
```

## 📝 重要な注意事項

1. **Service Roleキーは絶対に公開しない**
2. **RLSポリシーを必ず設定する**
3. **定期的にバックアップを確認**
4. **本番環境での直接的なDB操作は避ける**
5. **Migration履歴を管理する**