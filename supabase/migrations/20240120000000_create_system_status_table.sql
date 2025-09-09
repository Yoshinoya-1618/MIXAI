-- システムステータステーブル
CREATE TABLE IF NOT EXISTS system_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  services JSONB NOT NULL,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('operational', 'degraded', 'outage')),
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL
);

-- インシデントテーブル
CREATE TABLE IF NOT EXISTS incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  affected_services TEXT[]
);

-- メンテナンス予定テーブル
CREATE TABLE IF NOT EXISTS maintenances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  affected_services TEXT[],
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- インデックス
CREATE INDEX idx_system_status_created_at ON system_status(created_at DESC);
CREATE INDEX idx_system_status_overall_status ON system_status(overall_status);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_maintenances_scheduled_at ON maintenances(scheduled_at);

-- RLS
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（誰でも閲覧可能）
CREATE POLICY "System status is viewable by everyone" ON system_status
  FOR SELECT USING (true);

CREATE POLICY "Incidents are viewable by everyone" ON incidents
  FOR SELECT USING (true);

CREATE POLICY "Maintenances are viewable by everyone" ON maintenances
  FOR SELECT USING (true);

-- 管理者のみ書き込み可能
CREATE POLICY "Only service role can insert system status" ON system_status
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update system status" ON system_status
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can manage incidents" ON incidents
  FOR ALL USING (auth.role() = 'service_role');