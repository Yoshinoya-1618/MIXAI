-- ================================================
-- Initial Data Setup
-- Version: 1.0.0
-- Date: 2025-01-07
-- ================================================

-- ================================================
-- Update plans with actual Stripe Price IDs
-- ================================================
-- NOTE: Replace these placeholder price IDs with actual ones from Stripe Dashboard
-- Dashboard → 商品カタログ → 各商品 → 価格ID (price_xxxxx形式)

UPDATE plans SET 
  stripe_price_id = 'price_REPLACE_WITH_LITE_PRICE_ID',
  features = jsonb_build_object(
    'max_duration', 60,
    'max_file_mb', 20,
    'advanced_features', false,
    'storage_days', 7,
    'monthly_credits', 3.0,
    'support_level', 'basic'
  )
WHERE code = 'lite';

UPDATE plans SET 
  stripe_price_id = 'price_REPLACE_WITH_STANDARD_PRICE_ID',
  features = jsonb_build_object(
    'max_duration', 120,
    'max_file_mb', 50,
    'advanced_features', true,
    'storage_days', 15,
    'monthly_credits', 6.0,
    'support_level', 'priority'
  )
WHERE code = 'standard';

UPDATE plans SET 
  stripe_price_id = 'price_REPLACE_WITH_CREATOR_PRICE_ID',
  features = jsonb_build_object(
    'max_duration', 180,
    'max_file_mb', 100,
    'advanced_features', true,
    'priority_processing', true,
    'storage_days', 30,
    'monthly_credits', 10.0,
    'support_level', 'premium'
  )
WHERE code = 'creator';

-- ================================================
-- Create default admin user (optional)
-- ================================================
-- Uncomment if you want to create an admin user
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'admin@mixai.jp',
  crypt('CHANGE_THIS_PASSWORD', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;
*/

-- ================================================
-- Sample alert for monitoring test
-- ================================================
INSERT INTO alerts (type, message, metadata) VALUES
  ('system', 'Database migration completed successfully', 
   jsonb_build_object('version', '1.0.0', 'timestamp', NOW()));