-- ================================================
-- Data cleanup fields and artifacts table
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- jobsテーブルに削除関連フィールドを追加
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS retention_days INTEGER;

-- 削除フラグのインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at) WHERE deleted_at IS NULL;

-- アーティファクトテーブル（一時ファイル管理）
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_path TEXT,
  size_bytes BIGINT,
  mime_type TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_artifacts_expires_at ON artifacts(expires_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id);

-- RLSポリシー
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY artifacts_select_own ON artifacts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY artifacts_insert_own ON artifacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY artifacts_delete_own ON artifacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- 保存期間を計算する関数
CREATE OR REPLACE FUNCTION calculate_retention_days(plan_code TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE plan_code
    WHEN 'freetrial' THEN 7
    WHEN 'prepaid' THEN 7
    WHEN 'lite' THEN 7
    WHEN 'standard' THEN 15
    WHEN 'creator' THEN 30
    ELSE 7
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ジョブ作成時に保存期間を自動設定するトリガー
CREATE OR REPLACE FUNCTION set_job_retention()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_code TEXT;
  v_retention_days INTEGER;
BEGIN
  -- ユーザーのプランを取得
  SELECT plan_code INTO v_plan_code
  FROM subscriptions
  WHERE user_id = NEW.user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- プランが見つからない場合はprepaid扱い
  IF v_plan_code IS NULL THEN
    v_plan_code := 'prepaid';
  END IF;
  
  -- 保存期間を計算
  v_retention_days := calculate_retention_days(v_plan_code);
  
  -- retention_daysを設定
  NEW.retention_days := v_retention_days;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS set_job_retention_trigger ON jobs;
CREATE TRIGGER set_job_retention_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_retention();

-- コメント
COMMENT ON COLUMN jobs.deleted_at IS 'データ削除日時';
COMMENT ON COLUMN jobs.deletion_reason IS '削除理由（expired/user_request/admin）';
COMMENT ON COLUMN jobs.retention_days IS 'プラン別保存期間（日数）';
COMMENT ON TABLE artifacts IS '一時ファイル管理テーブル';