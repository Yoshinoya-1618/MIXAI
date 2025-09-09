-- ============================================
-- MIXAI 不足カラム追加スクリプト（修正版）
-- ============================================
-- APIが期待するカラムを安全に追加

-- 1. preset_keyカラムの追加
-- ============================================

DO $$
BEGIN
  -- preset_keyカラムを確認して追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'preset_key'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN preset_key TEXT;
    RAISE NOTICE 'Added column: preset_key to jobs table';
  ELSE
    RAISE NOTICE 'Column preset_key already exists in jobs table';
  END IF;
END $$;

-- 2. duration_sカラムの追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'duration_s'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN duration_s INTEGER;
    RAISE NOTICE 'Added column: duration_s to jobs table';
  ELSE
    RAISE NOTICE 'Column duration_s already exists in jobs table';
  END IF;
END $$;

-- 3. titleカラムの追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN title TEXT;
    RAISE NOTICE 'Added column: title to jobs table';
  ELSE
    RAISE NOTICE 'Column title already exists in jobs table';
  END IF;
END $$;

-- 4. その他の必要なカラムを追加
-- ============================================

DO $$
BEGIN
  -- checkpointsカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'checkpoints'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN checkpoints JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: checkpoints to jobs table';
  END IF;

  -- settingsカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN settings JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: settings to jobs table';
  END IF;

  -- metadataカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: metadata to jobs table';
  END IF;

  -- thumbnail_urlカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE 'Added column: thumbnail_url to jobs table';
  END IF;

  -- harmony_pathカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'harmony_path'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN harmony_path TEXT;
    RAISE NOTICE 'Added column: harmony_path to jobs table';
  END IF;
END $$;

-- 5. projectsビューの再作成（新しいカラムを含む）
-- ============================================

DROP VIEW IF EXISTS projects CASCADE;

CREATE VIEW projects AS
SELECT 
  j.id,
  j.user_id,
  COALESCE(j.title, 
    CASE 
      WHEN j.preset_key IS NOT NULL THEN 
        CASE j.preset_key
          WHEN 'clean_light' THEN 'クリーンライト'
          WHEN 'warm_vintage' THEN 'ウォームビンテージ'
          WHEN 'bright_modern' THEN 'ブライトモダン'
          WHEN 'punchy_rock' THEN 'パンチーロック'
          WHEN 'smooth_rnb' THEN 'スムースR&B'
          WHEN 'crisp_pop' THEN 'クリスプポップ'
          WHEN 'mellow_jazz' THEN 'メロウジャズ'
          ELSE 'Untitled Project'
        END
      ELSE 'Untitled Project'
    END
  ) as title,
  CASE 
    WHEN j.status::text IN ('uploaded', 'UPLOADED') THEN 'UPLOADED'
    WHEN j.status::text = 'paid' THEN 'PREPPED'
    WHEN j.status::text = 'processing' THEN 'TWEAKING'
    WHEN j.status::text IN ('done', 'DONE') THEN 'DONE'
    WHEN j.status::text = 'failed' THEN 'FAILED'
    ELSE UPPER(j.status::text)
  END as status,
  COALESCE(j.plan_code, 'lite') as plan,
  j.instrumental_path,
  j.vocal_path,
  j.harmony_path,
  j.result_path,
  j.preset_key,
  j.duration_s,
  j.error,
  COALESCE(j.checkpoints, '{}'::jsonb) as checkpoints,
  j.thumbnail_url,
  COALESCE(j.settings, '{}'::jsonb) as settings,
  COALESCE(j.metadata, '{}'::jsonb) as metadata,
  j.created_at,
  j.updated_at
FROM public.jobs j;

-- ビューへの権限付与
GRANT SELECT ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- 6. 既存データのデフォルト値設定
-- ============================================

-- preset_keyがNULLのレコードにデフォルト値を設定（オプション）
UPDATE public.jobs 
SET preset_key = 'clean_light'
WHERE preset_key IS NULL 
  AND status::text != 'uploaded'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'preset_key'
  );

-- 7. 完了確認
-- ============================================

DO $$
DECLARE
  col_count INTEGER;
  has_preset_key BOOLEAN;
  has_duration_s BOOLEAN;
  has_plan_code BOOLEAN;
  has_title BOOLEAN;
BEGIN
  -- jobsテーブルのカラム数を確認
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'jobs';
  
  -- 各カラムの存在を確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'preset_key'
  ) INTO has_preset_key;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'duration_s'
  ) INTO has_duration_s;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'plan_code'
  ) INTO has_plan_code;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'title'
  ) INTO has_title;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Column addition completed!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total columns in jobs table: %', col_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Key columns status:';
  
  IF has_preset_key THEN
    RAISE NOTICE '✓ preset_key exists';
  ELSE
    RAISE NOTICE '✗ preset_key missing';
  END IF;
  
  IF has_duration_s THEN
    RAISE NOTICE '✓ duration_s exists';
  ELSE
    RAISE NOTICE '✗ duration_s missing';
  END IF;
  
  IF has_plan_code THEN
    RAISE NOTICE '✓ plan_code exists';
  ELSE
    RAISE NOTICE '✗ plan_code missing';
  END IF;
  
  IF has_title THEN
    RAISE NOTICE '✓ title exists';
  ELSE
    RAISE NOTICE '✗ title missing';
  END IF;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Projects view has been updated';
  RAISE NOTICE '====================================';
END $$;