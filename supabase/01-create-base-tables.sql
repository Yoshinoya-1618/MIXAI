-- ============================================
-- MIXAI 基本テーブル作成スクリプト
-- ============================================
-- このスクリプトを最初に実行してください

-- 1. プロジェクトテーブル（基本）
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'UPLOADED' CHECK (status IN (
    'UPLOADED', 'PREPPED', 'AI_MIX_OK', 'TWEAKING', 
    'MASTERING', 'REVIEW', 'DONE', 'ARCHIVED', 'EXPIRED'
  )),
  plan TEXT DEFAULT 'Light' CHECK (plan IN ('Light', 'Standard', 'Creator')),
  
  -- ファイルパス
  instrumental_path TEXT,
  vocal_path TEXT,
  harmony_path TEXT,
  result_path TEXT,
  
  -- メタデータ
  checkpoints JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- 2. ジョブテーブル（処理タスク管理）
-- ============================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- ジョブ情報
  type TEXT NOT NULL CHECK (type IN (
    'UPLOAD', 'PREPROCESS', 'AI_MIX', 'TWEAK', 'MASTER', 'EXPORT'
  )),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  
  -- 処理パラメータ
  input_params JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- 進捗管理
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- 3. ユーザー設定テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 表示設定
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
  
  -- 通知設定
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  notification_settings JSONB DEFAULT '{}',
  
  -- プラン情報
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'light', 'standard', 'creator')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- その他の設定
  preferences JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ファイルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- ファイル情報
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN (
    'instrumental', 'vocal', 'harmony', 'result', 'preview', 'other'
  )),
  mime_type TEXT,
  file_size BIGINT,
  
  -- ストレージ情報
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'project-files',
  public_url TEXT,
  
  -- メタデータ
  duration_seconds DECIMAL,
  sample_rate INTEGER,
  bit_rate INTEGER,
  metadata JSONB DEFAULT '{}',
  
  -- ステータス
  status TEXT DEFAULT 'uploaded' CHECK (status IN (
    'uploaded', 'processing', 'ready', 'failed', 'deleted'
  )),
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

-- 5. プリセットテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- プリセット情報
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mix', 'master', 'custom')),
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  
  -- 設定値
  settings JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  tags TEXT[],
  
  -- 使用統計
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_type ON presets(type);
CREATE INDEX IF NOT EXISTS idx_presets_is_public ON presets(is_public);

-- 6. 自動更新トリガー
-- ============================================

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. RLS (Row Level Security) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- projectsテーブルのポリシー
CREATE POLICY "Users can view own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON projects FOR DELETE 
  USING (auth.uid() = user_id);

-- jobsテーブルのポリシー
CREATE POLICY "Users can view own jobs" 
  ON jobs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create jobs" 
  ON jobs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" 
  ON jobs FOR UPDATE 
  USING (auth.uid() = user_id);

-- user_settingsテーブルのポリシー
CREATE POLICY "Users can view own settings" 
  ON user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
  ON user_settings FOR ALL 
  USING (auth.uid() = user_id);

-- filesテーブルのポリシー
CREATE POLICY "Users can view own files" 
  ON files FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files" 
  ON files FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" 
  ON files FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" 
  ON files FOR DELETE 
  USING (auth.uid() = user_id);

-- presetsテーブルのポリシー
CREATE POLICY "Users can view own and public presets" 
  ON presets FOR SELECT 
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create presets" 
  ON presets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets" 
  ON presets FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets" 
  ON presets FOR DELETE 
  USING (auth.uid() = user_id);

-- 8. 初期データとヘルパー関数
-- ============================================

-- 新規ユーザー作成時の初期設定
CREATE OR REPLACE FUNCTION handle_new_user_base()
RETURNS TRIGGER AS $$
BEGIN
  -- ユーザー設定を初期化
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER on_auth_user_created_base
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_base();

-- プロジェクト作成ヘルパー関数
CREATE OR REPLACE FUNCTION create_project(
  p_user_id UUID,
  p_title TEXT DEFAULT NULL,
  p_plan TEXT DEFAULT 'Light'
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
BEGIN
  INSERT INTO projects (user_id, title, plan, status)
  VALUES (
    p_user_id,
    COALESCE(p_title, 'Untitled Project'),
    p_plan,
    'UPLOADED'
  )
  RETURNING id INTO new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql;

-- 9. 実行完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Base tables created successfully!';
  RAISE NOTICE 'Tables: projects, jobs, user_settings, files, presets';
  RAISE NOTICE 'RLS policies applied';
  RAISE NOTICE 'Triggers and functions created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run 02-create-dashboard-tables.sql';
END $$;