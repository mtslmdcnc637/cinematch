-- ============================================================
-- MrCine Gamification v3 — Supabase Migration
-- Tabelas: user_streaks, user_achievements, user_challenges,
--          daily_xp_tracking + RLS + Leaderboard View
-- ============================================================

-- ── 1. user_streaks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak    INTEGER DEFAULT 0,
  longest_streak    INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_status     VARCHAR(10) DEFAULT 'active'
                    CHECK (streak_status IN ('active','frozen','broken')),
  streak_freeze_count INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. user_achievements ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  VARCHAR(50) NOT NULL,
  tier            VARCHAR(10) NOT NULL CHECK (tier IN ('bronze','silver','gold','diamond')),
  unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id, tier)
);

-- ── 3. user_challenges ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type  VARCHAR(10) NOT NULL CHECK (challenge_type IN ('daily','weekly','monthly')),
  challenge_key   VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL,
  target          INTEGER NOT NULL,
  progress        INTEGER DEFAULT 0,
  xp_reward       INTEGER NOT NULL,
  rarity          VARCHAR(10) DEFAULT 'common'
                  CHECK (rarity IN ('common','rare','epic','legendary')),
  is_completed    BOOLEAN DEFAULT FALSE,
  assigned_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at    TIMESTAMPTZ,
  UNIQUE(user_id, challenge_key, assigned_date)
);

-- ── 4. daily_xp_tracking ────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_xp_tracking (
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  rating_count      INTEGER DEFAULT 0,
  xp_from_ratings   INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- ── 5. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_date ON user_challenges(user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_xp_tracking_user_date ON daily_xp_tracking(user_id, date);

-- ── 6. RLS ──────────────────────────────────────────────────
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_xp_tracking ENABLE ROW LEVEL SECURITY;

-- user_streaks
CREATE POLICY "Users read own streaks"   ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streaks"  ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streaks"  ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- user_achievements
CREATE POLICY "Users read own achievements"  ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_challenges
CREATE POLICY "Users read own challenges"    ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own challenges"  ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own challenges"  ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- daily_xp_tracking
CREATE POLICY "Users read own xp tracking"   ON daily_xp_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp tracking" ON daily_xp_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own xp tracking" ON daily_xp_tracking FOR UPDATE USING (auth.uid() = user_id);

-- ── 7. Leaderboard View ─────────────────────────────────────
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  p.xp,
  p.level,
  p.subscription_plan,
  s.current_streak,
  COALESCE(a.achievement_count, 0) AS achievement_count
FROM profiles p
LEFT JOIN user_streaks s ON s.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS achievement_count
  FROM user_achievements
  GROUP BY user_id
) a ON a.user_id = p.id
ORDER BY p.xp DESC;

-- Leaderboard is read-only, only needs SELECT policy (view owner is postgres)
-- Grant select to anon and authenticated
GRANT SELECT ON public.leaderboard TO anon;
GRANT SELECT ON public.leaderboard TO authenticated;

-- ── 8. profiles table additions ─────────────────────────────
-- Add streak and achievement count cache columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievement_count INTEGER DEFAULT 0;
