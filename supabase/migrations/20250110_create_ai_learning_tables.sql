-- AI学習機能のためのテーブル作成
-- Phase A: CPU最小構成での実装

-- 特徴量ストア
CREATE TABLE IF NOT EXISTS features_store (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL,
  clip_kind TEXT NOT NULL CHECK (clip_kind IN ('inst', 'vocal', 'mix')),
  n_dim INT NOT NULL,
  vec REAL[] NOT NULL, -- ~160次元の特徴量ベクトル
  stats JSONB, -- 追加統計（LUFS/LRA等）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_features_job_id (job_id),
  INDEX idx_features_user_id (user_id),
  INDEX idx_features_clip_kind (clip_kind),
  INDEX idx_features_created_at (created_at)
);

-- ラベル（教師データ）
CREATE TABLE IF NOT EXISTS labels (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('master_reg', 'preset_cls', 'align_conf')),
  y_reg REAL[], -- 回帰の教師（4次元: [low_shelf_db, high_shelf_db, comp_db, target_lufs]）
  y_cls TEXT, -- 分類の教師（プリセットID）
  quality TEXT DEFAULT 'auto' CHECK (quality IN ('auto', 'human', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_labels_job_id (job_id),
  INDEX idx_labels_task (task),
  INDEX idx_labels_quality (quality)
);

-- モデルレジストリ
CREATE TABLE IF NOT EXISTS model_registry (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. 'master_reg', 'preset_cls'
  version TEXT NOT NULL, -- e.g. 'v20250110'
  uri TEXT NOT NULL, -- Supabase Storage上のONNXファイルパス
  framework TEXT NOT NULL DEFAULT 'skl2onnx',
  input_dim INT NOT NULL,
  output_dim INT NOT NULL,
  metrics JSONB NOT NULL, -- {mae: ..., r2: ..., f1: ..., accuracy: ...}
  is_active BOOLEAN DEFAULT FALSE, -- 現在アクティブなモデル
  rollout_percentage INT DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- インデックス
  UNIQUE (name, version),
  INDEX idx_model_registry_name (name),
  INDEX idx_model_registry_active (is_active)
);

-- オンライン計測
CREATE TABLE IF NOT EXISTS model_metrics (
  id BIGSERIAL PRIMARY KEY,
  model_id BIGINT REFERENCES model_registry(id) ON DELETE CASCADE,
  window TEXT NOT NULL CHECK (window IN ('1h', '1d', '7d', '30d')),
  n INT NOT NULL, -- サンプル数
  latency_ms FLOAT8, -- 平均レイテンシ
  err_rate FLOAT8, -- エラー率
  mae FLOAT8, -- 平均絶対誤差（回帰）
  accuracy FLOAT8, -- 精度（分類）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_model_metrics_model_id (model_id),
  INDEX idx_model_metrics_window (window),
  INDEX idx_model_metrics_created_at (created_at)
);

-- 学習ジョブ管理
CREATE TABLE IF NOT EXISTS training_jobs (
  id BIGSERIAL PRIMARY KEY,
  task TEXT NOT NULL CHECK (task IN ('master_reg', 'preset_cls', 'align_conf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  config JSONB NOT NULL, -- 学習設定
  metrics JSONB, -- 学習結果のメトリクス
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- インデックス
  INDEX idx_training_jobs_status (status),
  INDEX idx_training_jobs_task (task)
);

-- データ同意管理
CREATE TABLE IF NOT EXISTS ml_consent (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  quality_improvement BOOLEAN DEFAULT FALSE, -- QA（品質改善）への同意
  model_training BOOLEAN DEFAULT FALSE, -- 学習への同意
  consent_date TIMESTAMPTZ,
  withdrawal_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_ml_consent_user_id (user_id),
  INDEX idx_ml_consent_training (model_training)
);

-- 学習データ除外リスト（撤回管理）
CREATE TABLE IF NOT EXISTS ml_exclusions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID,
  reason TEXT NOT NULL CHECK (reason IN ('withdrawal', 'quality', 'legal_hold', 'manual')),
  excluded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_ml_exclusions_user_id (user_id),
  INDEX idx_ml_exclusions_job_id (job_id)
);

-- フィーチャーフラグ（既存テーブルに追加）
INSERT INTO feature_flags (name, key, description, is_enabled, rollout_percentage)
VALUES 
  ('CPU機械学習', 'enable_cpu_ml', 'CPU推論によるAI最適化', false, 0),
  ('マスター値回帰', 'enable_master_regression', 'AIによるマスタリングパラメータ推定', false, 0),
  ('プリセット推薦', 'enable_preset_recommendation', 'AIによるプリセット自動選択', false, 0),
  ('アライン信頼度', 'enable_align_confidence', 'AIによるアライメント品質評価', false, 0)
ON CONFLICT (key) DO NOTHING;

-- RLSポリシー
ALTER TABLE features_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_exclusions ENABLE ROW LEVEL SECURITY;

-- features_store: ユーザーは自分のデータのみ閲覧可能
CREATE POLICY "Users can view own features" ON features_store
  FOR SELECT USING (auth.uid() = user_id);

-- labels: 管理者のみ閲覧・編集可能
CREATE POLICY "Admins can manage labels" ON labels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin', 'ops')
    )
  );

-- model_registry: 誰でも閲覧可能、管理者のみ編集可能
CREATE POLICY "Anyone can view models" ON model_registry
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage models" ON model_registry
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin', 'ops')
    )
  );

CREATE POLICY "Admins can update models" ON model_registry
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin', 'ops')
    )
  );

-- model_metrics: 誰でも閲覧可能
CREATE POLICY "Anyone can view metrics" ON model_metrics
  FOR SELECT USING (true);

-- training_jobs: 管理者のみ
CREATE POLICY "Admins can manage training jobs" ON training_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin', 'ops')
    )
  );

-- ml_consent: ユーザーは自分の同意のみ管理可能
CREATE POLICY "Users can manage own consent" ON ml_consent
  FOR ALL USING (auth.uid() = user_id);

-- ml_exclusions: 管理者のみ
CREATE POLICY "Admins can manage exclusions" ON ml_exclusions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND roles IN ('admin')
    )
  );

-- 統計ビュー作成
CREATE OR REPLACE VIEW ml_stats AS
SELECT 
  (SELECT COUNT(*) FROM features_store) as total_features,
  (SELECT COUNT(DISTINCT user_id) FROM features_store) as unique_users,
  (SELECT COUNT(*) FROM labels) as total_labels,
  (SELECT COUNT(*) FROM model_registry WHERE is_active = true) as active_models,
  (SELECT AVG(latency_ms) FROM model_metrics WHERE window = '1d' AND created_at > NOW() - INTERVAL '1 day') as avg_latency_1d,
  (SELECT COUNT(*) FROM ml_consent WHERE model_training = true) as training_consents;

-- 関数: 同意撤回時のデータ削除
CREATE OR REPLACE FUNCTION handle_ml_consent_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.model_training = false AND OLD.model_training = true THEN
    -- 除外リストに追加
    INSERT INTO ml_exclusions (user_id, reason)
    VALUES (NEW.user_id, 'withdrawal');
    
    -- 24時間後に削除するジョブをスケジュール（実装は別途Cronで）
    INSERT INTO audit_logs (actor_id, action, entity, metadata)
    VALUES (
      NEW.user_id,
      'ml:consent_withdrawal',
      'user:' || NEW.user_id,
      jsonb_build_object(
        'scheduled_deletion', NOW() + INTERVAL '24 hours',
        'affected_features', (SELECT COUNT(*) FROM features_store WHERE user_id = NEW.user_id)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ml_consent_change
  AFTER UPDATE ON ml_consent
  FOR EACH ROW
  EXECUTE FUNCTION handle_ml_consent_withdrawal();

COMMENT ON TABLE features_store IS 'AI学習用の特徴量ストレージ';
COMMENT ON TABLE labels IS 'AI学習用のラベル（教師データ）';
COMMENT ON TABLE model_registry IS 'MLモデルのバージョン管理';
COMMENT ON TABLE model_metrics IS 'MLモデルのオンライン性能計測';
COMMENT ON TABLE training_jobs IS '学習ジョブの管理';
COMMENT ON TABLE ml_consent IS 'ユーザーのML利用同意管理';
COMMENT ON TABLE ml_exclusions IS '学習データから除外するレコード管理';