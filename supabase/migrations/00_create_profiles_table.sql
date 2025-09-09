-- ====================================
-- 基本テーブルの作成（profilesテーブル）
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
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLSポリシー：ユーザーは自分のプロファイルを更新可能
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLSポリシー：管理者は全プロファイルを閲覧可能
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND ('admin' = ANY(p.roles) OR 'ops' = ANY(p.roles))
    )
  );

-- 自動的にプロファイルを作成するトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
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