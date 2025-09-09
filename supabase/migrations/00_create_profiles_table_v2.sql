-- ====================================
-- 基本テーブルの作成（profilesテーブル）V2
-- Supabase Auth v2対応版
-- ====================================

-- profilesテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',
  credits DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);

-- RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：ユーザーは自分のプロファイルを読み取り可能
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLSポリシー：ユーザーは自分のプロファイルを更新可能
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLSポリシー：新規作成を許可
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLSポリシー：管理者は全プロファイルを閲覧可能
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND ('admin' = ANY(p.roles) OR 'ops' = ANY(p.roles))
    )
  );

-- 自動的にプロファイルを作成するトリガー関数（修正版）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- auth.usersからメールアドレスを取得
  -- Supabase Auth v2では raw_user_meta_data にメールが格納される場合がある
  user_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    NEW.email
  );

  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, user_email)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(profiles.email, EXCLUDED.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersにユーザーが追加されたときのトリガー
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーの設定
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 既存ユーザーのプロファイル作成
-- ====================================

-- 既存のauth.usersに対してprofilesレコードを作成
INSERT INTO profiles (id, email)
SELECT 
  au.id,
  COALESCE(
    au.email,
    au.raw_user_meta_data->>'email',
    au.email
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ====================================
-- デフォルト管理者の設定（必要に応じて）
-- ====================================

-- 特定のメールアドレスに管理者権限を付与する例
-- ※実際のメールアドレスに置き換えてください
/*
UPDATE profiles 
SET roles = array_append(roles, 'admin')
WHERE email = 'your-admin-email@example.com'
AND NOT ('admin' = ANY(roles));
*/