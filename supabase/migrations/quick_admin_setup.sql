-- ====================================
-- クイック管理者セットアップ
-- これを一つずつ実行してください
-- ====================================

-- ステップ1: profilesテーブルの現在の構造を確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- ステップ2: rolesカラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- ステップ3: 現在ログインしているユーザーのIDを確認
SELECT auth.uid() as your_user_id;

-- ステップ4: 自分に管理者権限を付与
UPDATE profiles 
SET roles = ARRAY['admin']
WHERE id = auth.uid();

-- ステップ5: 結果を確認
SELECT id, roles FROM profiles WHERE id = auth.uid();

-- ステップ6: 管理機能用の追加テーブルを作成（簡易版）
-- 機能フラグテーブル
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout INT NOT NULL DEFAULT 100,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 監査ログテーブル（簡易版）
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIXジョブテーブル（簡易版）
CREATE TABLE IF NOT EXISTS mix_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  credits_used DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 保持ポリシーテーブル
CREATE TABLE IF NOT EXISTS retention_policies (
  plan TEXT PRIMARY KEY,
  days_inst INT NOT NULL DEFAULT 7,
  days_vocal INT NOT NULL DEFAULT 7,
  days_master INT NOT NULL DEFAULT 15,
  days_preview INT NOT NULL DEFAULT 30
);

-- ステップ7: 初期データを挿入
-- 機能フラグの初期値
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('enable_hq_master', true, 'HQマスター機能'),
  ('enable_align', true, '自動アライン機能'),
  ('enable_cpu_ml', false, 'CPU機械学習モデル')
ON CONFLICT (key) DO NOTHING;

-- 保持ポリシーの初期値
INSERT INTO retention_policies (plan, days_inst, days_vocal, days_master, days_preview) VALUES
  ('lite', 7, 7, 15, 30),
  ('standard', 7, 7, 15, 30),
  ('creator', 7, 7, 15, 30),
  ('freetrial', 3, 3, 7, 14)
ON CONFLICT (plan) DO NOTHING;

-- ステップ8: 最終確認
SELECT 
  'Profiles with admin role:' as info,
  count(*) as count
FROM profiles 
WHERE 'admin' = ANY(roles)
UNION ALL
SELECT 
  'Feature flags:' as info,
  count(*) as count
FROM feature_flags
UNION ALL
SELECT 
  'Retention policies:' as info,
  count(*) as count
FROM retention_policies;