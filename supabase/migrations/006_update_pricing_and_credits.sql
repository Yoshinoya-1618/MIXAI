-- ================================================
-- Update Pricing and Add Credit Packs
-- Version: 1.0.0
-- Date: 2025-01-08
-- ================================================

-- ================================================
-- Update plan prices (tax included)
-- ================================================
UPDATE plans SET 
  price_jpy = 1780,
  updated_at = NOW()
WHERE code = 'lite';

UPDATE plans SET 
  price_jpy = 3980,
  updated_at = NOW()
WHERE code = 'standard';

UPDATE plans SET 
  price_jpy = 7380,
  updated_at = NOW()
WHERE code = 'creator';

-- ================================================
-- Credit Packs table
-- ================================================
CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  credits DECIMAL(10,2) NOT NULL,
  price_jpy INTEGER NOT NULL,
  price_per_credit DECIMAL(10,2) GENERATED ALWAYS AS (price_jpy / credits) STORED,
  discount_percent DECIMAL(5,2),
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert credit packs
INSERT INTO credit_packs (code, name, credits, price_jpy, discount_percent) VALUES
  ('mini', 'ミニパック', 2.0, 1580, 1.25),
  ('small', 'スモールパック', 5.0, 3800, 5.00),
  ('medium', 'ミディアムパック', 8.0, 5920, 7.50),
  ('large', 'ラージパック', 12.0, 8400, 12.50)
ON CONFLICT (code) DO UPDATE SET
  price_jpy = EXCLUDED.price_jpy,
  discount_percent = EXCLUDED.discount_percent,
  updated_at = NOW();

-- ================================================
-- On-Demand (pay-as-you-go) features tracking
-- ================================================
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS is_on_demand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS addon_harmony BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS addon_hq_master BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS addon_noise_reduction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS estimated_credits DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS consumed_credits DECIMAL(10,2);

-- ================================================
-- Update credit_ledger for new transaction types
-- ================================================
ALTER TABLE credit_ledger
DROP CONSTRAINT IF EXISTS credit_ledger_type_check;

ALTER TABLE credit_ledger
ADD CONSTRAINT credit_ledger_type_check 
CHECK (type IN ('grant', 'consume', 'purchase', 'expire', 'refund', 'hold', 'release'));

-- ================================================
-- Function: Calculate job credit cost
-- ================================================
CREATE OR REPLACE FUNCTION calculate_job_credits(
  p_base_processing BOOLEAN DEFAULT TRUE,
  p_addon_harmony BOOLEAN DEFAULT FALSE,
  p_addon_hq_master BOOLEAN DEFAULT FALSE,
  p_addon_noise_reduction BOOLEAN DEFAULT FALSE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total DECIMAL(10,2) := 0;
BEGIN
  -- Base processing cost
  IF p_base_processing THEN
    v_total := v_total + 1.0;
  END IF;
  
  -- Add-on costs (0.5C each)
  IF p_addon_harmony THEN
    v_total := v_total + 0.5;
  END IF;
  
  IF p_addon_hq_master THEN
    v_total := v_total + 0.5;
  END IF;
  
  IF p_addon_noise_reduction THEN
    v_total := v_total + 0.5;
  END IF;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================
-- Function: Hold credits (for processing)
-- ================================================
CREATE OR REPLACE FUNCTION hold_credits(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_job_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  -- Get current balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Create hold entry
  INSERT INTO credit_ledger (
    user_id, amount, balance_after, type, bucket, description, job_id
  ) VALUES (
    p_user_id, -p_amount, v_balance - p_amount, 
    'hold', 'monthly', COALESCE(p_description, 'Processing hold'), p_job_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Release held credits (on failure)
-- ================================================
CREATE OR REPLACE FUNCTION release_held_credits(
  p_user_id UUID,
  p_job_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  -- Get current balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  -- Release credits
  INSERT INTO credit_ledger (
    user_id, amount, balance_after, type, bucket, description, job_id
  ) VALUES (
    p_user_id, p_amount, v_balance + p_amount,
    'release', 'monthly', 'Processing failed - credits released', p_job_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- View: User credit summary with on-demand info
-- ================================================
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(uc.total_credits, 0) as total_credits,
  COALESCE(s.plan_code, 'free') as plan_code,
  COALESCE(p.name, 'Free') as plan_name,
  CASE 
    WHEN s.plan_code IS NULL THEN TRUE
    ELSE FALSE
  END as is_on_demand,
  COALESCE(p.storage_days, 7) as storage_days,
  COUNT(DISTINCT j.id) FILTER (WHERE j.created_at > NOW() - INTERVAL '30 days') as jobs_last_30_days
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_code = p.code
LEFT JOIN jobs j ON u.id = j.user_id
GROUP BY u.id, u.email, uc.total_credits, s.plan_code, p.name, p.storage_days;

-- ================================================
-- Indexes for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_jobs_is_on_demand ON jobs(is_on_demand);
CREATE INDEX IF NOT EXISTS idx_credit_packs_active ON credit_packs(active);

-- ================================================
-- Grant permissions
-- ================================================
GRANT SELECT ON credit_packs TO authenticated;
GRANT SELECT ON user_credit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_job_credits TO authenticated;
GRANT EXECUTE ON FUNCTION hold_credits TO authenticated;
GRANT EXECUTE ON FUNCTION release_held_credits TO authenticated;