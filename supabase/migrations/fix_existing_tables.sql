-- ====================================
-- 既存テーブルの修正
-- ====================================

-- 1. 現在のprofilesテーブルの構造を確認
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. rolesカラムを追加（存在しない場合）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- 3. その他の必要なカラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits DECIMAL(10,2) DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);

-- 5. 管理者権限を最初のユーザーに付与
-- まず現在のユーザーを確認
SELECT 
  p.*,
  au.raw_user_meta_data->>'email' as email
FROM profiles p
JOIN auth.users au ON au.id = p.id
LIMIT 10;

-- 6. 管理者権限を付与（自分のIDに置き換えてください）
-- 例：
/*
UPDATE profiles 
SET roles = ARRAY['admin']
WHERE id = (
  SELECT id FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
);
*/

-- 7. 権限を確認
SELECT 
  p.id,
  p.roles,
  au.raw_user_meta_data->>'email' as email
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.roles IS NOT NULL;