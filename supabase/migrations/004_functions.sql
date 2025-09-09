-- ================================================
-- Database Functions
-- Version: 1.0.0
-- Date: 2025-01-07
-- ================================================

-- ================================================
-- Function: Get user's current credit balance
-- ================================================
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS TABLE (
  total_credits DECIMAL(10,2),
  trial_credits DECIMAL(10,2),
  monthly_credits DECIMAL(10,2),
  addon_credits DECIMAL(10,2),
  carryover_credits DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cl.amount), 0)::DECIMAL(10,2) as total_credits,
    COALESCE(SUM(CASE WHEN cl.bucket = 'trial' THEN cl.amount ELSE 0 END), 0)::DECIMAL(10,2) as trial_credits,
    COALESCE(SUM(CASE WHEN cl.bucket = 'monthly' THEN cl.amount ELSE 0 END), 0)::DECIMAL(10,2) as monthly_credits,
    COALESCE(SUM(CASE WHEN cl.bucket = 'addon' THEN cl.amount ELSE 0 END), 0)::DECIMAL(10,2) as addon_credits,
    COALESCE(SUM(CASE WHEN cl.bucket = 'carryover' THEN cl.amount ELSE 0 END), 0)::DECIMAL(10,2) as carryover_credits
  FROM credit_ledger cl
  WHERE cl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Grant trial credits to new user
-- ================================================
CREATE OR REPLACE FUNCTION grant_trial_credits(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_trial_credits DECIMAL(10,2) := 2.0; -- 7日間無料トライアル分
BEGIN
  -- Get current balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  -- Grant trial credits
  INSERT INTO credit_ledger (
    user_id, 
    amount, 
    balance_after, 
    type, 
    bucket, 
    description
  ) VALUES (
    p_user_id,
    v_trial_credits,
    v_balance + v_trial_credits,
    'grant',
    'trial',
    '7日間無料トライアル'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Consume credits for job
-- ================================================
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_job_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_trial_balance DECIMAL(10,2);
  v_monthly_balance DECIMAL(10,2);
  v_addon_balance DECIMAL(10,2);
  v_carryover_balance DECIMAL(10,2);
  v_remaining DECIMAL(10,2);
  v_consume_from_trial DECIMAL(10,2) := 0;
  v_consume_from_monthly DECIMAL(10,2) := 0;
  v_consume_from_carryover DECIMAL(10,2) := 0;
  v_consume_from_addon DECIMAL(10,2) := 0;
BEGIN
  -- Get current balances by bucket
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN bucket = 'trial' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bucket = 'monthly' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bucket = 'addon' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bucket = 'carryover' THEN amount ELSE 0 END), 0)
  INTO v_balance, v_trial_balance, v_monthly_balance, v_addon_balance, v_carryover_balance
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  v_remaining := p_amount;
  
  -- Consume from trial credits first
  IF v_trial_balance > 0 AND v_remaining > 0 THEN
    v_consume_from_trial := LEAST(v_trial_balance, v_remaining);
    v_remaining := v_remaining - v_consume_from_trial;
    
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, job_id
    ) VALUES (
      p_user_id, -v_consume_from_trial, v_balance - v_consume_from_trial, 
      'consume', 'trial', COALESCE(p_description, 'Job processing'), p_job_id
    );
    
    v_balance := v_balance - v_consume_from_trial;
  END IF;
  
  -- Then consume from monthly credits
  IF v_monthly_balance > 0 AND v_remaining > 0 THEN
    v_consume_from_monthly := LEAST(v_monthly_balance, v_remaining);
    v_remaining := v_remaining - v_consume_from_monthly;
    
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, job_id
    ) VALUES (
      p_user_id, -v_consume_from_monthly, v_balance - v_consume_from_monthly,
      'consume', 'monthly', COALESCE(p_description, 'Job processing'), p_job_id
    );
    
    v_balance := v_balance - v_consume_from_monthly;
  END IF;
  
  -- Then consume from carryover credits
  IF v_carryover_balance > 0 AND v_remaining > 0 THEN
    v_consume_from_carryover := LEAST(v_carryover_balance, v_remaining);
    v_remaining := v_remaining - v_consume_from_carryover;
    
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, job_id
    ) VALUES (
      p_user_id, -v_consume_from_carryover, v_balance - v_consume_from_carryover,
      'consume', 'carryover', COALESCE(p_description, 'Job processing'), p_job_id
    );
    
    v_balance := v_balance - v_consume_from_carryover;
  END IF;
  
  -- Finally consume from addon credits
  IF v_addon_balance > 0 AND v_remaining > 0 THEN
    v_consume_from_addon := LEAST(v_addon_balance, v_remaining);
    v_remaining := v_remaining - v_consume_from_addon;
    
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, job_id
    ) VALUES (
      p_user_id, -v_consume_from_addon, v_balance - v_consume_from_addon,
      'consume', 'addon', COALESCE(p_description, 'Job processing'), p_job_id
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Handle monthly credit grant (Anniversary-based)
-- ================================================
CREATE OR REPLACE FUNCTION grant_monthly_credits(
  p_user_id UUID,
  p_plan_code TEXT,
  p_invoice_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_monthly_credits DECIMAL(10,2);
  v_current_monthly DECIMAL(10,2);
  v_carryover_amount DECIMAL(10,2);
BEGIN
  -- Get plan credits
  SELECT monthly_credits INTO v_monthly_credits
  FROM plans
  WHERE code = p_plan_code;
  
  IF v_monthly_credits IS NULL THEN
    RAISE EXCEPTION 'Invalid plan code: %', p_plan_code;
  END IF;
  
  -- Get current balance
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN bucket = 'monthly' THEN amount ELSE 0 END), 0)
  INTO v_balance, v_current_monthly
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  -- Calculate carryover (all unused credits)
  v_carryover_amount := v_current_monthly;
  
  -- Move monthly credits to carryover if any remain
  IF v_carryover_amount > 0 THEN
    -- Expire old monthly credits
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, stripe_invoice_id
    ) VALUES (
      p_user_id, -v_current_monthly, v_balance - v_current_monthly,
      'expire', 'monthly', '月次クレジット期限切れ', p_invoice_id
    );
    
    v_balance := v_balance - v_current_monthly;
    
    -- Add to carryover
    INSERT INTO credit_ledger (
      user_id, amount, balance_after, type, bucket, description, stripe_invoice_id
    ) VALUES (
      p_user_id, v_carryover_amount, v_balance + v_carryover_amount,
      'grant', 'carryover', '繰越クレジット', p_invoice_id
    );
    
    v_balance := v_balance + v_carryover_amount;
  END IF;
  
  -- Grant new monthly credits
  INSERT INTO credit_ledger (
    user_id, amount, balance_after, type, bucket, description, stripe_invoice_id
  ) VALUES (
    p_user_id, v_monthly_credits, v_balance + v_monthly_credits,
    'grant', 'monthly', p_plan_code || 'プラン月次クレジット', p_invoice_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Clean up expired data
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $$
DECLARE
  v_retention_days INTEGER := 7; -- Default retention
BEGIN
  -- Delete old jobs and associated data based on plan retention
  DELETE FROM jobs j
  WHERE j.created_at < NOW() - INTERVAL '1 day' * (
    SELECT COALESCE(p.storage_days, v_retention_days)
    FROM subscriptions s
    JOIN plans p ON s.plan_code = p.code
    WHERE s.user_id = j.user_id
    LIMIT 1
  );
  
  -- Delete old billing events (keep 90 days)
  DELETE FROM billing_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old alerts (keep 30 days)
  DELETE FROM alerts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Get subscription status
-- ================================================
CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  plan_code TEXT,
  plan_name TEXT,
  status TEXT,
  current_period_end TIMESTAMP,
  trial_ends_at TIMESTAMP,
  cancel_at_period_end BOOLEAN,
  total_credits DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id IS NOT NULL as has_subscription,
    s.plan_code,
    p.name as plan_name,
    s.status,
    s.current_period_end,
    s.trial_ends_at,
    s.cancel_at_period_end,
    uc.total_credits
  FROM auth.users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  LEFT JOIN plans p ON s.plan_code = p.code
  LEFT JOIN user_credits uc ON u.id = uc.user_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_status TO authenticated;