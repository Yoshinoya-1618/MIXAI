-- ====================================
-- 最小限のセットアップ（エラー回避版）
-- emailカラムを使用せず、最小限の構成で開始
-- ====================================

-- 1. profilesテーブルの作成（最小構成）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',
  credits DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);

-- 3. RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. 管理者ポリシー
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

-- 6. シンプルなトリガー関数（emailを使用しない）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. トリガーの設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. 既存ユーザーのプロファイル作成
INSERT INTO profiles (id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;