-- ====================================
-- 運営管理基盤テーブル作成
-- ====================================

-- 1. profiles テーブルに roles カラムを追加（存在しなければ）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- rolesのインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);

-- 2. 2FA（TOTP）テーブル
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  backup_codes TEXT[], -- バックアップコード
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- e.g. 'credits:adjust', 'user:suspend', 'vault:access'
  entity TEXT NOT NULL, -- e.g. 'profiles:uuid', 'storage:path', 'jobs:uuid'
  before JSONB,
  after JSONB,
  reason TEXT, -- 操作理由（危険操作では必須）
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 監査ログのインデックス
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. 機能フラグテーブル
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout INT NOT NULL DEFAULT 100 CHECK (rollout >= 0 AND rollout <= 100),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Admin Vault（保管庫）テーブル
CREATE TABLE IF NOT EXISTS vault_items (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  kind TEXT NOT NULL CHECK (kind IN ('inst','vocal','master','preview','waveform')),
  path TEXT NOT NULL,
  sha256 TEXT,
  file_size BIGINT,
  duration_sec INT,
  samplerate INT,
  consent TEXT NOT NULL DEFAULT 'none' CHECK (consent IN ('none','support','qa','training')),
  purpose TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  legal_hold BOOLEAN DEFAULT false,
  accessed_at TIMESTAMPTZ,
  accessed_by UUID REFERENCES auth.users(id)
);

-- Vaultのインデックス
CREATE INDEX idx_vault_items_job_id ON vault_items(job_id);
CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_kind ON vault_items(kind);
CREATE INDEX idx_vault_items_expires_at ON vault_items(expires_at);
CREATE INDEX idx_vault_items_legal_hold ON vault_items(legal_hold);

-- 6. プラン別保持期間ポリシー
CREATE TABLE IF NOT EXISTS retention_policies (
  plan TEXT PRIMARY KEY,
  days_inst INT NOT NULL DEFAULT 7,
  days_vocal INT NOT NULL DEFAULT 7,
  days_master INT NOT NULL DEFAULT 15,
  days_preview INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 二名承認テーブル（4-eyes principle）
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'credits_adjust_large', -- クレジット調整（±10以上）
    'user_suspend', -- ユーザー凍結
    'user_delete', -- ユーザー削除
    'vault_access_original', -- 原本閲覧
    'vault_export', -- 原本エクスポート
    'retention_change', -- 保持期間変更
    'legal_hold_change', -- 法的ホールド変更
    'feature_flag_rollout' -- 大規模ロールアウト（>50%）
  )),
  entity_id TEXT NOT NULL, -- 対象のID
  entity_data JSONB, -- 詳細データ
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  rejected_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  approval_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 承認要求のインデックス
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_approval_requests_expires_at ON approval_requests(expires_at);

-- 8. MIXジョブテーブル（存在しなければ作成）
CREATE TABLE IF NOT EXISTS mix_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  inst_path TEXT,
  vocal_path TEXT,
  master_path TEXT,
  preview_path TEXT,
  waveform_path TEXT,
  processing_options JSONB DEFAULT '{}',
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  credits_used DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIXジョブのインデックス
CREATE INDEX IF NOT EXISTS idx_mix_jobs_user_id ON mix_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_mix_jobs_status ON mix_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mix_jobs_created_at ON mix_jobs(created_at DESC);

-- ====================================
-- RLS (Row Level Security) ポリシー
-- ====================================

-- audit_logs: 管理者のみ読み取り可能
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND ('admin' = ANY(profiles.roles) OR 'ops' = ANY(profiles.roles))
    )
  );

-- feature_flags: 誰でも読み取り可、管理者のみ更新可
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags" ON feature_flags
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- vault_items: 管理者のみアクセス可能
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vault items" ON vault_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND ('admin' = ANY(profiles.roles) OR 'ops' = ANY(profiles.roles))
    )
  );

-- approval_requests: 管理者のみアクセス可能
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage approval requests" ON approval_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- user_mfa: 本人と管理者のみアクセス可能
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own MFA" ON user_mfa
  FOR ALL
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- retention_policies: 管理者のみ更新可能
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view retention policies" ON retention_policies
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage retention policies" ON retention_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- mix_jobs: 本人と管理者のみアクセス可能
ALTER TABLE mix_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON mix_jobs
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND ('admin' = ANY(profiles.roles) OR 'ops' = ANY(profiles.roles) OR 'support' = ANY(profiles.roles))
    )
  );

CREATE POLICY "Admins can manage all jobs" ON mix_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND ('admin' = ANY(profiles.roles) OR 'ops' = ANY(profiles.roles))
    )
  );

-- ====================================
-- 初期データ
-- ====================================

-- 保持期間ポリシーの初期値
INSERT INTO retention_policies (plan, days_inst, days_vocal, days_master, days_preview) VALUES
  ('lite', 7, 7, 15, 30),
  ('standard', 7, 7, 15, 30),
  ('creator', 7, 7, 15, 30),
  ('freetrial', 3, 3, 7, 14),
  ('prepaid', 7, 7, 15, 30)
ON CONFLICT (plan) DO NOTHING;

-- 機能フラグの初期値
INSERT INTO feature_flags (key, enabled, rollout, description) VALUES
  ('enable_hq_master', true, 100, 'HQマスター機能（DSP処理）'),
  ('enable_align', true, 100, '自動アライン機能'),
  ('enable_cpu_ml', false, 0, 'CPU機械学習モデル'),
  ('enable_deep_sep', false, 0, 'ディープ音源分離'),
  ('enable_noise_reduction', false, 0, 'ノイズ抑制機能'),
  ('enable_2fa_enforcement', false, 0, '2FA必須化（管理者）'),
  ('enable_ip_restriction', false, 0, 'IP制限機能')
ON CONFLICT (key) DO NOTHING;

-- ====================================
-- トリガー関数
-- ====================================

-- updated_at を自動更新する関数（既存の場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_user_mfa_updated_at
  BEFORE UPDATE ON user_mfa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mix_jobs_updated_at
  BEFORE UPDATE ON mix_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();