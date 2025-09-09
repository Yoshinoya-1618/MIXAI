-- ================================================
-- Row Level Security (RLS) Policies
-- Version: 1.0.0
-- Date: 2025-01-07
-- ================================================

-- ================================================
-- Enable RLS on all tables
-- ================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ================================================
-- Plans table policies (public read)
-- ================================================
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage plans" ON plans;
CREATE POLICY "Service role can manage plans" ON plans
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Subscriptions table policies
-- ================================================
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Billing customers table policies
-- ================================================
DROP POLICY IF EXISTS "Users can view own billing info" ON billing_customers;
CREATE POLICY "Users can view own billing info" ON billing_customers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage billing customers" ON billing_customers;
CREATE POLICY "Service role can manage billing customers" ON billing_customers
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Credit ledger table policies
-- ================================================
DROP POLICY IF EXISTS "Users can view own credits" ON credit_ledger;
CREATE POLICY "Users can view own credits" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage credits" ON credit_ledger;
CREATE POLICY "Service role can manage credits" ON credit_ledger
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Billing invoices table policies
-- ================================================
DROP POLICY IF EXISTS "Users can view own invoices" ON billing_invoices;
CREATE POLICY "Users can view own invoices" ON billing_invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage invoices" ON billing_invoices;
CREATE POLICY "Service role can manage invoices" ON billing_invoices
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Billing events table policies (service role only)
-- ================================================
DROP POLICY IF EXISTS "Service role can manage billing events" ON billing_events;
CREATE POLICY "Service role can manage billing events" ON billing_events
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Jobs table policies
-- ================================================
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own jobs" ON jobs;
CREATE POLICY "Users can create own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all jobs" ON jobs;
CREATE POLICY "Service role can manage all jobs" ON jobs
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Alerts table policies (service role only)
-- ================================================
DROP POLICY IF EXISTS "Service role can manage alerts" ON alerts;
CREATE POLICY "Service role can manage alerts" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================
-- Grant permissions to authenticated users
-- ================================================
GRANT SELECT ON plans TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON billing_customers TO authenticated;
GRANT SELECT ON credit_ledger TO authenticated;
GRANT SELECT ON billing_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON jobs TO authenticated;
GRANT SELECT ON user_credits TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;