-- ================================================
-- Add Free Plan and Creator Boost Support
-- Version: 1.0.0
-- Date: 2025-01-08
-- ================================================

-- ================================================
-- Free/Practice プランの追加
-- ================================================
INSERT INTO plans (code, name, price_jpy, monthly_credits, storage_days, features) VALUES
  ('free', 'Free', 0, 0.0, 3, 
   '{
     "max_duration": 60,
     "preview_export_seconds": 20,
     "export_bitrate_kbps": 96,
     "watermark": true,
     "daily_preview_quota": 1,
     "storage_days": 3,
     "ai_pitch_timing": false,
     "harmony_full": false,
     "export_wav": false
   }'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  features = EXCLUDED.features,
  updated_at = NOW();

-- ================================================
-- Creator Boost機能用のカラム追加
-- ================================================
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS creator_boost_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS selected_plan_code TEXT REFERENCES plans(code);

-- 既存のデータに対してselected_plan_codeを設定
UPDATE subscriptions 
SET selected_plan_code = plan_code 
WHERE selected_plan_code IS NULL;

-- ================================================
-- トライアル登録情報の拡張
-- ================================================
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_selected_plan TEXT REFERENCES plans(code),
ADD COLUMN IF NOT EXISTS trial_notification_sent_at JSONB DEFAULT '{}';

-- ================================================
-- Function: Grant Creator Boost
-- ================================================
CREATE OR REPLACE FUNCTION grant_creator_boost(
  p_user_id UUID,
  p_hours INTEGER DEFAULT 48
)
RETURNS TIMESTAMP AS $$
DECLARE
  v_boost_until TIMESTAMP;
BEGIN
  v_boost_until := NOW() + INTERVAL '1 hour' * p_hours;
  
  UPDATE subscriptions
  SET creator_boost_until = v_boost_until,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- ログ記録
  INSERT INTO credit_ledger (
    user_id, 
    amount, 
    balance_after, 
    type, 
    bucket, 
    description,
    metadata
  ) 
  SELECT 
    p_user_id,
    0,
    COALESCE(SUM(amount), 0),
    'grant',
    'trial',
    'Creator Boost (48時間)',
    jsonb_build_object('boost_until', v_boost_until)
  FROM credit_ledger
  WHERE user_id = p_user_id;
  
  RETURN v_boost_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Get user effective plan (with boost)
-- ================================================
CREATE OR REPLACE FUNCTION get_user_effective_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan_code TEXT;
  v_boost_until TIMESTAMP;
BEGIN
  SELECT plan_code, creator_boost_until
  INTO v_plan_code, v_boost_until
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Creator Boost有効期間中はCreatorプランとして扱う
  IF v_boost_until IS NOT NULL AND v_boost_until > NOW() THEN
    RETURN 'creator';
  END IF;
  
  -- 通常はサブスクリプションのプランを返す
  RETURN COALESCE(v_plan_code, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Function: Handle trial end (downshift to free if cancelled)
-- ================================================
CREATE OR REPLACE FUNCTION handle_trial_end(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- キャンセルされている場合はFreeプランへダウンシフト
  IF v_subscription.status = 'canceled' OR v_subscription.cancel_at_period_end THEN
    UPDATE subscriptions
    SET 
      plan_code = 'free',
      status = 'active',
      stripe_subscription_id = NULL,
      current_period_start = NOW(),
      current_period_end = NULL,
      trial_ends_at = NULL,
      cancel_at_period_end = FALSE,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- ログ記録
    INSERT INTO alerts (type, message, metadata)
    VALUES (
      'trial_downshift',
      'Trial ended - downshifted to Free plan',
      jsonb_build_object('user_id', p_user_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 権限設定
-- ================================================
GRANT EXECUTE ON FUNCTION grant_creator_boost TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_effective_plan TO authenticated;
GRANT EXECUTE ON FUNCTION handle_trial_end TO service_role;