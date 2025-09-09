-- ====================================
-- Auth構造の確認用SQL
-- 実行して結果を確認してください
-- ====================================

-- 1. auth.usersテーブルの構造を確認
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. 既存のユーザー数を確認
SELECT COUNT(*) as user_count FROM auth.users;

-- 3. profilesテーブルが存在するか確認
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_exists;

-- 4. サンプルユーザーのデータ構造を確認（1件のみ）
SELECT 
  id,
  CASE 
    WHEN email IS NOT NULL THEN 'has email column'
    ELSE 'no email column'
  END as email_status,
  CASE 
    WHEN raw_user_meta_data IS NOT NULL THEN 'has metadata'
    ELSE 'no metadata'
  END as metadata_status
FROM auth.users
LIMIT 1;