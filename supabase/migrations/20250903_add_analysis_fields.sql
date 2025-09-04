-- 高度なオフセット検出と解析機能のためのカラム追加

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS detected_offset_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_confidence DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS recommended_preset TEXT,
ADD COLUMN IF NOT EXISTS vocal_quality_score TEXT DEFAULT 'standard';