-- ================================================
-- Download history tracking
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- ダウンロード履歴テーブル
CREATE TABLE IF NOT EXISTS download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  plan_code TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_job_id ON download_history(job_id);
CREATE INDEX IF NOT EXISTS idx_download_history_created_at ON download_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_history_user_date ON download_history(user_id, created_at DESC);

-- RLSポリシー
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のダウンロード履歴のみ閲覧可能
CREATE POLICY download_history_select_own ON download_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- サービスロールのみ挿入可能
CREATE POLICY download_history_insert_service ON download_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ダウンロード統計ビュー
CREATE OR REPLACE VIEW download_stats AS
SELECT 
  user_id,
  DATE(created_at) as download_date,
  COUNT(*) as daily_count,
  COUNT(DISTINCT job_id) as unique_files,
  array_agg(DISTINCT file_type) as file_types
FROM download_history
GROUP BY user_id, DATE(created_at);

-- 月次ダウンロード統計ビュー
CREATE OR REPLACE VIEW monthly_download_stats AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as monthly_count,
  COUNT(DISTINCT job_id) as unique_files,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM download_history
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- コメント
COMMENT ON TABLE download_history IS 'ファイルダウンロード履歴';
COMMENT ON COLUMN download_history.file_type IS 'ダウンロードファイルタイプ（output/instrumental/vocal/harmony/preview）';
COMMENT ON COLUMN download_history.plan_code IS 'ダウンロード時のユーザープラン';