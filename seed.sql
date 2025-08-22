-- seed.sql
-- Database schema and seed data for subscription cancellation flow
-- Does not include production-level optimizations or advanced RLS policies

-- Enable Row Level Security

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  monthly_price INTEGER NOT NULL, -- Price in USD cents
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_cancellation', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cancellations table
CREATE TABLE IF NOT EXISTS cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  downsell_variant TEXT NOT NULL CHECK (downsell_variant IN ('A', 'B')),
  flow_type TEXT NOT NULL DEFAULT 'standard' CHECK (flow_type IN ('standard', 'found_job', 'offer_accepted')),
  reason TEXT,
  accepted_downsell BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create found_job_cancellations table
CREATE TABLE IF NOT EXISTS found_job_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancellation_id UUID REFERENCES cancellations(id) ON DELETE CASCADE,
  via_migrate_mate VARCHAR(3) NOT NULL CHECK (via_migrate_mate IN ('Yes', 'No')),
  roles_applied VARCHAR(10) NOT NULL CHECK (roles_applied IN ('0', '1-5', '6-20', '20+')),
  companies_emailed VARCHAR(10) NOT NULL CHECK (companies_emailed IN ('0', '1-5', '6-20', '20+')),
  companies_interviewed VARCHAR(10) NOT NULL CHECK (companies_interviewed IN ('0', '1-2', '3-5', '5+')),
  feedback TEXT NOT NULL CHECK (length(feedback) >= 25),
  visa_lawyer VARCHAR(3) NOT NULL CHECK (visa_lawyer IN ('Yes', 'No')),
  visa_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE found_job_cancellations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (candidates should enhance these)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cancellations" ON cancellations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cancellations" ON cancellations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own found job cancellations" ON found_job_cancellations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cancellations 
      WHERE cancellations.id = found_job_cancellations.cancellation_id 
      AND cancellations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own found job cancellations" ON found_job_cancellations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cancellations 
      WHERE cancellations.id = found_job_cancellations.cancellation_id 
      AND cancellations.user_id = auth.uid()
    )
  );

-- Keep subscriptions.updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Keep found_job_cancellations.updated_at fresh
DROP TRIGGER IF EXISTS set_found_job_cancellations_updated_at ON found_job_cancellations;
CREATE TRIGGER set_found_job_cancellations_updated_at
  BEFORE UPDATE ON found_job_cancellations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Indexes for performance and constraints
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_cancellation
  ON cancellations(user_id) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cancellations_user_created
  ON cancellations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_found_job_cancellation_id
  ON found_job_cancellations(cancellation_id);

CREATE INDEX IF NOT EXISTS idx_found_job_visa_lawyer
  ON found_job_cancellations(visa_lawyer);

CREATE INDEX IF NOT EXISTS idx_found_job_via_migrate_mate
  ON found_job_cancellations(via_migrate_mate);

-- Seed data
INSERT INTO users (id, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'user1@example.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'user2@example.com'),
  ('550e8400-e29b-41d4-a716-446655440003', 'user3@example.com')
ON CONFLICT (email) DO NOTHING;

-- Seed subscriptions with $25 and $29 plans
INSERT INTO subscriptions (user_id, monthly_price, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 2500, 'active'), -- $25.00
  ('550e8400-e29b-41d4-a716-446655440002', 2900, 'active'), -- $29.00
  ('550e8400-e29b-41d4-a716-446655440003', 2500, 'active')  -- $25.00
ON CONFLICT DO NOTHING; 