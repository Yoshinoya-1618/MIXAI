-- ================================================
-- Processing queue table for MIX jobs
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- 処理キューテーブルの作成
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  processing_params JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_processing_queue_created_at ON processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_queue_job_id ON processing_queue(job_id);

-- RLSポリシー
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のキューのみ閲覧可能
CREATE POLICY processing_queue_select_own ON processing_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- サービスロールのみ挿入・更新可能
CREATE POLICY processing_queue_service_all ON processing_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- jobsテーブルに処理パラメータカラムを追加
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS processing_params JSONB DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS harmony_pattern TEXT;

-- コメント追加
COMMENT ON TABLE processing_queue IS 'MIX処理ジョブのキュー管理';
COMMENT ON COLUMN processing_queue.priority IS 'プラン別優先度（Creator:10, Standard:5, その他:1）';
COMMENT ON COLUMN jobs.processing_params IS '処理精度やテーマなどのパラメータ';