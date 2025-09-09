-- RemixSession table for tracking remix sessions
CREATE TABLE IF NOT EXISTS remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  charged BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_remix_sessions_project_id ON remix_sessions(project_id);
CREATE INDEX idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX idx_remix_sessions_expires_at ON remix_sessions(expires_at);

-- Add checkpoints column to projects table if not exists
ALTER TABLE projects ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}';

-- Add event_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for event_logs
CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_project_id ON event_logs(project_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

-- Add credit_transactions table for tracking credit usage
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_transactions
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Add user_credits table for tracking user credit balance
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to clean up expired remix sessions
CREATE OR REPLACE FUNCTION cleanup_expired_remix_sessions()
RETURNS void AS $$
BEGIN
  UPDATE remix_sessions
  SET ended_at = NOW(),
      end_reason = 'EXPIRED'
  WHERE expires_at < NOW()
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired projects
CREATE OR REPLACE FUNCTION cleanup_expired_projects()
RETURNS void AS $$
DECLARE
  plan_days JSONB := '{"Light": 7, "Standard": 15, "Creator": 30}'::JSONB;
  project_record RECORD;
BEGIN
  FOR project_record IN 
    SELECT id, plan, created_at 
    FROM projects 
    WHERE status != 'EXPIRED'
  LOOP
    IF NOW() > project_record.created_at + INTERVAL '1 day' * (plan_days->>(project_record.plan))::INTEGER THEN
      -- Mark as expired
      UPDATE projects 
      SET status = 'EXPIRED',
          updated_at = NOW()
      WHERE id = project_record.id;
      
      -- Log the expiration
      INSERT INTO event_logs (user_id, project_id, event_type, details)
      SELECT user_id, id, 'AUTO_DELETE_EXPIRED', 
             jsonb_build_object(
               'plan', plan,
               'createdAt', created_at,
               'expiredAt', NOW()
             )
      FROM projects
      WHERE id = project_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Policies for remix_sessions
CREATE POLICY "Users can view their own remix sessions" 
  ON remix_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own remix sessions" 
  ON remix_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own remix sessions" 
  ON remix_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policies for event_logs
CREATE POLICY "Users can view their own event logs" 
  ON event_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event logs" 
  ON event_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policies for credit_transactions
CREATE POLICY "Users can view their own credit transactions" 
  ON credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- Policies for user_credits
CREATE POLICY "Users can view their own credits" 
  ON user_credits FOR SELECT 
  USING (auth.uid() = user_id);