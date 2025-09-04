-- MIX後の微調整機能（v1.3）対応
-- AI適用後パラメータとスナップショット管理

-- jobsテーブルに新カラム追加（後方互換）
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ai_params jsonb,              -- AI適用直後（AI_BASE）
  ADD COLUMN IF NOT EXISTS user_params jsonb,            -- 現在の編集（USER_EDIT）  
  ADD COLUMN IF NOT EXISTS last_export_params jsonb,     -- 直近書き出し（LAST_EXPORT）
  ADD COLUMN IF NOT EXISTS metrics jsonb;                -- LUFS/TP/PLR/GRなど

-- Creatorの参照曲解析テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS public.mix_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL,                              -- 参照曲のアップロードID
  analysis jsonb NOT NULL,                              -- tonal/dynamics/stereo/weights
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobs_ai_params ON public.jobs USING gin (ai_params);
CREATE INDEX IF NOT EXISTS idx_jobs_user_params ON public.jobs USING gin (user_params);
CREATE INDEX IF NOT EXISTS idx_jobs_metrics ON public.jobs USING gin (metrics);
CREATE INDEX IF NOT EXISTS idx_mix_refs_job_id ON public.mix_refs (job_id);
CREATE INDEX IF NOT EXISTS idx_mix_refs_upload_id ON public.mix_refs (upload_id);

-- RLS設定（mix_refs）
ALTER TABLE public.mix_refs ENABLE ROW LEVEL SECURITY;

-- mix_refsのRLSポリシー
DROP POLICY IF EXISTS "Users can manage their own mix references" ON public.mix_refs;
CREATE POLICY "Users can manage their own mix references" 
  ON public.mix_refs 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = mix_refs.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mix_refs_updated_at ON public.mix_refs;
CREATE TRIGGER update_mix_refs_updated_at 
  BEFORE UPDATE ON public.mix_refs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ構造（ドキュメント用）
/*
-- ai_params / user_params / last_export_params の構造例
{
  "air": 0.4,
  "body": 0.3, 
  "punch": 0.5,
  "width": 0.1,
  "vocal": 0.6,
  "clarity": 0.3,           -- Standard/Creator
  "presence": 0.2,          -- Creator
  "fade_in": 0,
  "fade_out": 0,
  "output_gain": 0,
  "genre_target": "j-pop",
  "offset_ms": 15.5,
  "processing_settings": {
    "plan": "standard",
    "dtw_enabled": true,
    "pitch_correction": [...],
    "oversampling": 8
  }
}

-- metrics の構造例
{
  "offset_accuracy": "excellent",
  "tempo_stability": "stable", 
  "pitch_quality": "good",
  "estimated_lufs": -14.0,
  "estimated_tp": -1.0,
  "processing_complexity": "standard",
  "last_export_lufs": -13.8,
  "last_export_tp": -0.9,
  "last_export_format": "mp3",
  "last_export_at": "2025-09-04T12:00:00Z"
}

-- mix_refs.analysis の構造例
{
  "tonal": {
    "low_shelf": -0.5,
    "mid_boost": 1.2,
    "high_shelf": 0.8
  },
  "dynamics": {
    "crest_factor": 12.5,
    "plr": 18.2
  },
  "stereo": {
    "width": 0.85,
    "correlation": 0.92
  },
  "weights": {
    "tonal": 0.7,
    "dynamics": 0.5,
    "stereo": 0.3
  },
  "suggest_diff": {
    "air": 0.2,
    "vocal": -0.1,
    ...
  },
  "analyzed_at": "2025-09-04T12:00:00Z"
}
*/