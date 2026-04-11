-- 1. Create Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free', -- 'free', 'monthly', 'quarterly', 'annual'
  status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Update Profiles Table for Usage Limits (Free vs PRO)
ALTER TABLE profiles 
ADD COLUMN swipes_today INTEGER DEFAULT 0,
ADD COLUMN last_swipe_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN dicas_today INTEGER DEFAULT 0,
ADD COLUMN last_dica_date DATE DEFAULT CURRENT_DATE;

-- 3. Function to reset daily limits automatically
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_swipe_date < CURRENT_DATE THEN
    NEW.swipes_today = 0;
    NEW.last_swipe_date = CURRENT_DATE;
  END IF;
  
  IF NEW.last_dica_date < CURRENT_DATE THEN
    NEW.dicas_today = 0;
    NEW.last_dica_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the reset before any update on profiles
CREATE TRIGGER trigger_reset_daily_limits
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION reset_daily_limits();
