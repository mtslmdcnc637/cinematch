-- ═══════════════════════════════════════════════════════════
-- CineMatch — Database Schema Updates (v2)
-- ═══════════════════════════════════════════════════════════

-- 1. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free', -- 'free', 'monthly', 'quarterly', 'annual'
  status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stripe_subscription_id)
);

-- Enable RLS for Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Update Profiles Table for Usage Limits & Subscription Status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS swipes_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_swipe_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS dicas_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dica_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

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
DROP TRIGGER IF EXISTS trigger_reset_daily_limits ON profiles;
CREATE TRIGGER trigger_reset_daily_limits
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION reset_daily_limits();

-- 4. Public Profiles Table (for shared profile URLs)
CREATE TABLE IF NOT EXISTS public_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  bio TEXT DEFAULT '',
  favorite_count INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public_profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own public profile"
  ON public_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own public profile"
  ON public_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Consent table (LGPD)
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL, -- 'terms', 'privacy', 'marketing', 'data_collection'
  granted BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, consent_type)
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- 7. Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Quiz Responses (for analytics / dashboard)
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  profile_type TEXT,
  answers JSONB,
  last_step INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (quiz users may not be logged in yet)
CREATE POLICY "Allow anon inserts" ON quiz_responses
  FOR INSERT WITH CHECK (true);

-- Only authenticated users / service role can read analytics
CREATE POLICY "Allow service role select" ON quiz_responses
  FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_created_at ON quiz_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_completed ON quiz_responses(completed);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_profile_type ON quiz_responses(profile_type);
