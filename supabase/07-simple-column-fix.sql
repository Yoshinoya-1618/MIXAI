-- ============================================
-- MIXAI シンプルカラム追加スクリプト
-- ============================================
-- エラーを避けるため、最もシンプルな方法で実行

-- 1. 必要なカラムを一括追加（存在チェック付き）
-- ============================================

-- preset_key
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS preset_key TEXT;

-- duration_s
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS duration_s INTEGER;

-- title
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS title TEXT;

-- plan_code（既に存在する可能性が高いが念のため）
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite';

-- checkpoints
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}';

-- settings
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- metadata
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- thumbnail_url
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- harmony_path
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS harmony_path TEXT;

-- 2. projectsビューの作成または更新
-- ============================================

DROP VIEW IF EXISTS projects CASCADE;

CREATE VIEW projects AS
SELECT 
  j.id,
  j.user_id,
  COALESCE(j.title, 'Untitled Project') as title,
  j.status,
  COALESCE(j.plan_code, 'lite') as plan,
  j.instrumental_path,
  j.vocal_path,
  j.harmony_path,
  j.result_path,
  j.preset_key,
  j.duration_s,
  j.error,
  j.checkpoints,
  j.thumbnail_url,
  j.settings,
  j.metadata,
  j.created_at,
  j.updated_at
FROM public.jobs j;

-- 3. 権限設定
-- ============================================

GRANT SELECT ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- 4. 確認クエリ（手動で実行して確認）
-- ============================================

-- このクエリを実行して、カラムが追加されたか確認できます：
/*
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'jobs'
  AND column_name IN (
    'preset_key', 
    'duration_s', 
    'title', 
    'plan_code',
    'checkpoints',
    'settings',
    'metadata',
    'thumbnail_url',
    'harmony_path'
  )
ORDER BY column_name;
*/

-- 5. テストクエリ（動作確認用）
-- ============================================

-- projectsビューが正しく動作するか確認：
/*
SELECT 
  id,
  title,
  status,
  plan,
  preset_key,
  created_at
FROM projects
LIMIT 1;
*/