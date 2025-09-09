-- ============================================
-- MIXAI 不足カラム追加スクリプト
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

-- 2. duration_sカラムの追加（APIで使用）
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

-- 3. errorカラムの確認と追加（既に存在する可能性が高い）
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'error'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN error TEXT;
    RAISE NOTICE 'Added column: error to jobs table';
  ELSE
    RAISE NOTICE 'Column error already exists in jobs table';
  END IF;
END $$;

-- 4. projectsビューの再作成（新しいカラムを含む）
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

RAISE NOTICE 'Updated projects view with new columns';

-- 5. 既存データのデフォルト値設定
-- ============================================

-- preset_keyがNULLのレコードにデフォルト値を設定
UPDATE public.jobs 
SET preset_key = 'clean_light'
WHERE preset_key IS NULL 
  AND status != 'uploaded';

-- 6. カラム情報の表示
-- ============================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  -- jobsテーブルのカラム数を確認
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'jobs';
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Column addition completed!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total columns in jobs table: %', col_count;
  RAISE NOTICE '';
  
  -- 主要なカラムの存在を確認
  RAISE NOTICE 'Checking key columns:';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'preset_key'
  ) THEN
    RAISE NOTICE '✓ preset_key exists';
  ELSE
    RAISE NOTICE '✗ preset_key missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'duration_s'
  ) THEN
    RAISE NOTICE '✓ duration_s exists';
  ELSE
    RAISE NOTICE '✗ duration_s missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'plan_code'
  ) THEN
    RAISE NOTICE '✓ plan_code exists';
  ELSE
    RAISE NOTICE '✗ plan_code missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'title'
  ) THEN
    RAISE NOTICE '✓ title exists';
  ELSE
    RAISE NOTICE '✗ title missing';
  END IF;
  
  RAISE NOTICE '====================================';
END $$;