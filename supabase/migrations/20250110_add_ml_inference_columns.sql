-- ML推論結果を保存するためのカラム追加
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS ml_inference_results JSONB,
ADD COLUMN IF NOT EXISTS ml_inference_at TIMESTAMPTZ;

-- ML推論結果のコメント
COMMENT ON COLUMN jobs.ml_inference_results IS 'ML推論の結果（マスタリングパラメータ、プリセット推薦など）';
COMMENT ON COLUMN jobs.ml_inference_at IS 'ML推論を実行した日時';

-- A/Bテスト割り当てテーブル
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  UNIQUE (user_id, test_id),
  INDEX idx_ab_test_user (user_id),
  INDEX idx_ab_test_id (test_id)
);

-- A/Bテストメトリクステーブル
CREATE TABLE IF NOT EXISTS ab_test_metrics (
  id BIGSERIAL PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  value FLOAT8 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_ab_metrics_test (test_id),
  INDEX idx_ab_metrics_variant (variant_id),
  INDEX idx_ab_metrics_user (user_id),
  INDEX idx_ab_metrics_name (metric_name),
  INDEX idx_ab_metrics_created (created_at)
);

-- フィーチャーフラグにA/Bテスト設定を追加
ALTER TABLE feature_flags
ADD COLUMN IF NOT EXISTS ab_test_config JSONB;

COMMENT ON COLUMN feature_flags.ab_test_config IS 'A/Bテストの設定（バリアント、割合など）';

-- RLSポリシー
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_metrics ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の割り当てのみ閲覧可能
CREATE POLICY "Users can view own assignments" ON ab_test_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- メトリクスは管理者のみ閲覧可能
CREATE POLICY "Admins can view metrics" ON ab_test_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin', 'ops')
    )
  );

-- システムはメトリクスを書き込み可能（サービスロールキー使用時）
CREATE POLICY "System can insert metrics" ON ab_test_metrics
  FOR INSERT WITH CHECK (true);