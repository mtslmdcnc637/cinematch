import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS, CHALLENGE_TEMPLATES, CHALLENGE_RARITY_XP, pickChallengeRarity, type AchievementTier, type ChallengeRarity, type ChallengeType } from '../constants';
import type { UserStreak, UserAchievement, UserChallenge, DailyXPTracking, LeaderboardEntry } from '../types';

export const gamificationService = {
  // ── Streaks ─────────────────────────────────────────────
  getStreak: async (userId: string): Promise<UserStreak | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // No row found
      throw error;
    }
    return data;
  },

  upsertStreak: async (streak: Partial<UserStreak> & { user_id: string }): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
      .from('user_streaks')
      .upsert(streak, { onConflict: 'user_id' });
    if (error) throw error;
  },

  updateStreakOnActivity: async (userId: string, isPRO: boolean): Promise<UserStreak> => {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const today = new Date().toISOString().split('T')[0];
    const existing = await gamificationService.getStreak(userId);
    
    if (!existing) {
      // First ever activity
      const newStreak: UserStreak = {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        streak_status: 'active',
        streak_freeze_count: 0,
      };
      await gamificationService.upsertStreak(newStreak);
      return newStreak;
    }

    if (existing.last_activity_date === today) {
      // Already active today, no change
      return existing;
    }

    const lastDate = new Date(existing.last_activity_date!);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let newStreak = existing.current_streak;
    let newStatus: 'active' | 'frozen' | 'broken' = 'active';

    if (diffHours <= 48) {
      // Within grace period — streak continues
      newStreak = existing.current_streak + 1;
    } else {
      // Streak broken (beyond 48h grace)
      newStreak = 1;
      newStatus = 'broken';
      // After breaking, immediately start fresh as active
      newStatus = 'active';
    }

    const longestStreak = Math.max(existing.longest_streak, newStreak);

    const updated: UserStreak = {
      ...existing,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      streak_status: newStatus,
    };

    await gamificationService.upsertStreak(updated);
    return updated;
  },

  useStreakFreeze: async (userId: string): Promise<boolean> => {
    if (!supabase) return false;
    const existing = await gamificationService.getStreak(userId);
    if (!existing) return false;
    if (existing.streak_freeze_count >= 3) return false;
    if (existing.streak_status !== 'frozen') return false;

    const { error } = await supabase
      .from('user_streaks')
      .update({
        streak_status: 'active',
        streak_freeze_count: existing.streak_freeze_count + 1,
      })
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // ── Achievements ────────────────────────────────────────
  getAchievements: async (userId: string): Promise<UserAchievement[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  unlockAchievement: async (userId: string, achievementId: string, tier: AchievementTier): Promise<UserAchievement | null> => {
    if (!supabase) return null;
    
    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .eq('tier', tier)
      .single();
    
    if (existing) return null; // Already unlocked

    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        tier,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  checkAndUnlockAchievements: async (
    userId: string,
    stats: {
      totalRatings: number;
      lovedCount: number;
      genresExplored: number;
      maxGenreCount: number;
      currentStreak: number;
      friendCount: number;
      watchlistCount: number;
      level: number;
      codesRedeemed: number;
    }
  ): Promise<UserAchievement[]> => {
    const newlyUnlocked: UserAchievement[] = [];
    
    // Get already unlocked achievement keys
    const unlocked = await gamificationService.getAchievements(userId);
    const unlockedKeys = new Set(unlocked.map(a => `${a.achievement_id}:${a.tier}`));

    for (const achievement of ACHIEVEMENTS) {
      for (const tierDef of achievement.tiers) {
        const key = `${achievement.id}:${tierDef.tier}`;
        if (unlockedKeys.has(key)) continue;

        let meetsRequirement = false;
        switch (achievement.id) {
          case 'first_rating':
            meetsRequirement = stats.totalRatings >= tierDef.requirement;
            break;
          case 'rating_milestone':
            meetsRequirement = stats.totalRatings >= tierDef.requirement;
            break;
          case 'loved_master':
            meetsRequirement = stats.lovedCount >= tierDef.requirement;
            break;
          case 'genre_explorer':
            meetsRequirement = stats.genresExplored >= tierDef.requirement;
            break;
          case 'genre_specialist':
            meetsRequirement = stats.maxGenreCount >= tierDef.requirement;
            break;
          case 'streak_master':
            meetsRequirement = stats.currentStreak >= tierDef.requirement;
            break;
          case 'social_butterfly':
            meetsRequirement = stats.friendCount >= tierDef.requirement;
            break;
          case 'influencer':
            // This would need profile views tracking, skip for now
            break;
          case 'watchlist_collector':
            meetsRequirement = stats.watchlistCount >= tierDef.requirement;
            break;
          case 'league_progress':
            meetsRequirement = stats.level >= tierDef.requirement;
            break;
          case 'code_hunter':
            meetsRequirement = stats.codesRedeemed >= tierDef.requirement;
            break;
        }

        if (meetsRequirement) {
          const result = await gamificationService.unlockAchievement(userId, achievement.id, tierDef.tier);
          if (result) {
            newlyUnlocked.push(result);
          }
        }
      }
    }

    return newlyUnlocked;
  },

  // ── Challenges ──────────────────────────────────────────
  getChallenges: async (userId: string, type?: ChallengeType): Promise<UserChallenge[]> => {
    if (!supabase) return [];
    let query = supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('assigned_date', { ascending: false });
    
    if (type) query = query.eq('challenge_type', type);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  generateDailyChallenges: async (userId: string): Promise<UserChallenge[]> => {
    if (!supabase) return [];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already generated today
    const { data: existing } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_type', 'daily')
      .eq('assigned_date', today);
    
    if (existing && existing.length > 0) return existing;

    // Generate 3 daily challenges with random rarity
    const dailyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'daily');
    const selected = dailyTemplates.sort(() => Math.random() - 0.5).slice(0, 3);
    
    const challenges: UserChallenge[] = [];
    for (const template of selected) {
      const rarity = pickChallengeRarity();
      const xpReward = Math.floor(template.baseXP * CHALLENGE_RARITY_XP[rarity]);
      
      const { data, error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: userId,
          challenge_type: 'daily' as ChallengeType,
          challenge_key: template.key,
          description: template.description,
          target: template.targets[0],
          xp_reward: xpReward,
          rarity,
          assigned_date: today,
        })
        .select()
        .single();
      
      if (!error && data) challenges.push(data);
    }
    
    return challenges;
  },

  updateChallengeProgress: async (userId: string, challengeKey: string, increment: number = 1): Promise<UserChallenge | null> => {
    if (!supabase) return null;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Find matching active challenge
    const { data: challenge } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_key', challengeKey)
      .eq('is_completed', false)
      .gte('assigned_date', today) // Only today's or newer
      .order('assigned_date', { ascending: false })
      .limit(1)
      .single();
    
    if (!challenge) return null;

    const newProgress = challenge.progress + increment;
    const isCompleted = newProgress >= challenge.target;

    const { data, error } = await supabase
      .from('user_challenges')
      .update({
        progress: newProgress,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', challenge.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ── Daily XP Tracking (Soft Cap) ────────────────────────
  getDailyXPTracking: async (userId: string): Promise<DailyXPTracking | null> => {
    if (!supabase) return null;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_xp_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  trackRatingXP: async (userId: string, xpGained: number): Promise<DailyXPTracking> => {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get existing tracking
    const existing = await gamificationService.getDailyXPTracking(userId);
    
    if (existing) {
      const { data, error } = await supabase
        .from('daily_xp_tracking')
        .update({
          rating_count: existing.rating_count + 1,
          xp_from_ratings: existing.xp_from_ratings + xpGained,
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Create new tracking for today
    const { data, error } = await supabase
      .from('daily_xp_tracking')
      .insert({
        user_id: userId,
        date: today,
        rating_count: 1,
        xp_from_ratings: xpGained,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Leaderboard ─────────────────────────────────────────
  getLeaderboard: async (limit: number = 50): Promise<LeaderboardEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  getUserLeaderboardRank: async (userId: string): Promise<number | null> => {
    if (!supabase) return null;
    // Get all users sorted by XP and find the user's position
    const { data, error } = await supabase
      .from('profiles')
      .select('id, xp')
      .order('xp', { ascending: false });
    if (error) throw error;
    const index = data?.findIndex((u: any) => u.id === userId);
    return index !== undefined && index >= 0 ? index + 1 : null;
  },
};
