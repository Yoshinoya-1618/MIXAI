-- ================================================
-- Add theme_key column to jobs table
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- jobsテーブルにtheme_keyカラムを追加
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS theme_key TEXT;

-- デフォルト値の設定（既存レコード用）
UPDATE jobs 
SET theme_key = CASE 
  WHEN preset_key IS NOT NULL THEN preset_key  -- 既存のpreset_keyをtheme_keyとして使用
  ELSE 'clean_light'  -- デフォルトテーマ
END
WHERE theme_key IS NULL;

-- コメント追加
COMMENT ON COLUMN jobs.theme_key IS 'MIX前に選択されたテーマ（preset_keyとは別管理）';

-- インデックス追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_jobs_theme_key ON jobs(theme_key);