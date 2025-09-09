-- ====================================
-- 管理者権限の付与
-- ====================================

-- 手順1: 現在のユーザーを確認
-- まずこれを実行して、あなたのユーザーIDを確認してください
SELECT 
  id,
  raw_user_meta_data->>'email' as email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 手順2: 管理者権限を付与
-- 上記で確認したあなたのユーザーIDを使用してください
-- 例: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' の部分を実際のIDに置き換える

/*
-- コメントを外して実行
UPDATE profiles 
SET roles = ARRAY['admin']
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
*/

-- または、最初のユーザーを自動的に管理者にする場合：
/*
UPDATE profiles 
SET roles = ARRAY['admin']
WHERE id = (
  SELECT id FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
);
*/

-- 手順3: 権限を確認
SELECT 
  p.id,
  au.raw_user_meta_data->>'email' as email,
  p.roles,
  p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE 'admin' = ANY(p.roles);