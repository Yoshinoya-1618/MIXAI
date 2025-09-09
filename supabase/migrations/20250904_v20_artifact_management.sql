-- v2.0 アーティファクト管理システム
-- 3ステージのアーティファクト管理（prep/ai_ok/final）とTTL機能

-- 列挙型の追加
CREATE TYPE IF NOT EXISTS plan AS ENUM ('lite', 'standard', 'creator');
CREATE TYPE IF NOT EXISTS artifact_type AS ENUM ('prep', 'ai_ok', 'final');

-- jobsテーブルにアーティファクト管理カラムを追加
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS plan plan NOT NULL DEFAULT 'lite',
ADD COLUMN IF NOT EXISTS prep_artifact_id uuid,
ADD COLUMN IF NOT EXISTS ai_ok_artifact_id uuid,
ADD COLUMN IF NOT EXISTS final_artifact_id uuid,
ADD COLUMN IF NOT EXISTS duration_s integer;

-- アーティファクト管理テーブル
CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind artifact_type NOT NULL,
  storage_path text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- TTL設定トリガー関数（プラン別期限）
CREATE OR REPLACE FUNCTION set_artifact_ttl()
RETURNS trigger AS $$
BEGIN
  SELECT
    CASE j.plan
      WHEN 'lite' THEN now() + INTERVAL '7 days'
      WHEN 'standard' THEN now() + INTERVAL '15 days'  
      WHEN 'creator' THEN now() + INTERVAL '30 days'
    END
  INTO NEW.expires_at
  FROM jobs j WHERE j.id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TTL設定トリガー
DROP TRIGGER IF EXISTS artifacts_set_ttl ON artifacts;
CREATE TRIGGER artifacts_set_ttl
  BEFORE INSERT ON artifacts
  FOR EACH ROW EXECUTE FUNCTION set_artifact_ttl();

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_kind ON artifacts(kind);
CREATE INDEX IF NOT EXISTS idx_artifacts_expires_at ON artifacts(expires_at);

-- 外部キー制約を追加
ALTER TABLE jobs 
ADD CONSTRAINT IF NOT EXISTS fk_prep_artifact 
  FOREIGN KEY (prep_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;

ALTER TABLE jobs 
ADD CONSTRAINT IF NOT EXISTS fk_ai_ok_artifact 
  FOREIGN KEY (ai_ok_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;

ALTER TABLE jobs 
ADD CONSTRAINT IF NOT EXISTS fk_final_artifact 
  FOREIGN KEY (final_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;

-- RLSポリシー設定
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- artifactsテーブルへのRLSポリシー（job経由でユーザーチェック）
CREATE POLICY "Users can access their own artifacts" ON artifacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = artifacts.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- 期限切れアーティファクトの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_artifacts()
RETURNS void AS $$
BEGIN
  -- 期限切れアーティファクトを削除
  DELETE FROM artifacts 
  WHERE expires_at < now();
  
  -- 対応するjobsのアーティファクト参照をクリア
  UPDATE jobs 
  SET prep_artifact_id = NULL 
  WHERE prep_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.prep_artifact_id
  );
  
  UPDATE jobs 
  SET ai_ok_artifact_id = NULL 
  WHERE ai_ok_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.ai_ok_artifact_id
  );
  
  UPDATE jobs 
  SET final_artifact_id = NULL 
  WHERE final_artifact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM artifacts 
    WHERE artifacts.id = jobs.final_artifact_id
  );
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON TABLE artifacts IS '3ステージアーティファクト管理テーブル（prep/ai_ok/final）';
COMMENT ON COLUMN artifacts.kind IS 'アーティファクトの種類：prep（下ごしらえ）、ai_ok（AI仕上げ完了）、final（最終確認済み）';
COMMENT ON COLUMN artifacts.expires_at IS 'プラン別TTL：Lite 7日、Standard 15日、Creator 30日';
COMMENT ON FUNCTION set_artifact_ttl() IS 'アーティファクト作成時にプラン別TTLを自動設定';
COMMENT ON FUNCTION cleanup_expired_artifacts() IS '期限切れアーティファクトの自動削除（Edge Function or cron）';