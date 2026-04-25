import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gamificationService } from '../services/gamificationService';
import { STREAK_CONFIG, ACHIEVEMENTS } from '../constants';
import type { UserStreak, UserAchievement, UserChallenge, LeaderboardEntry, AchievementTier } from '../types';
import { toast } from 'sonner';

interface UseGamificationParams {
  user: { id: string } | null;
  isPro: boolean;
  totalRatings: number;
  lovedCount: number;
  genresExplored: number;
  maxGenreCount: number;
  friendCount: number;
  watchlistCount: number;
  level: number;
}

export function useGamification({
  user,
  isPro,
  totalRatings,
  lovedCount,
  genresExplored,
  maxGenreCount,
  friendCount,
  watchlistCount,
  level,
}: UseGamificationParams) {
  const queryClient = useQueryClient();
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<UserAchievement[]>([]);

  // ── Streak ──
  const { data: streak, isLoading: isStreakLoading } = useQuery({
    queryKey: ['streak', user?.id],
    queryFn: () => gamificationService.getStreak(user!.id),
    enabled: !!user,
  });

  // ── Achievements ──
  const { data: achievements = [], isLoading: isAchievementsLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => gamificationService.getAchievements(user!.id),
    enabled: !!user,
  });

  // ── Challenges ──
  const { data: challenges = [], isLoading: isChallengesLoading } = useQuery({
    queryKey: ['challenges', user?.id],
    queryFn: async () => {
      // Auto-generate daily challenges if needed
      await gamificationService.generateDailyChallenges(user!.id);
      return gamificationService.getChallenges(user!.id);
    },
    enabled: !!user,
  });

  // ── Leaderboard ──
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => gamificationService.getLeaderboard(50),
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });

  // ── User rank ──
  const { data: userRank } = useQuery({
    queryKey: ['userRank', user?.id],
    queryFn: () => gamificationService.getUserLeaderboardRank(user!.id),
    enabled: !!user,
  });

  // ── Auto-check achievements on mount and when stats change ──
  useEffect(() => {
    if (!user || totalRatings === 0) return;
    // Run achievement check silently on mount (don't spam toasts for existing unlocks)
    gamificationService.checkAndUnlockAchievements(user.id, {
      totalRatings,
      lovedCount,
      genresExplored,
      maxGenreCount,
      currentStreak: 0,
      friendCount,
      watchlistCount,
      level,
      codesRedeemed: 0,
    }).then(newlyUnlocked => {
      if (newlyUnlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
      }
    }).catch(() => {}); // Silently fail — achievements will be checked again on next rating
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only on user change, not on every stats change (to avoid loops)

  // ── Record activity (updates streak) ──
  const recordActivity = useCallback(async () => {
    if (!user) return;
    try {
      const updatedStreak = await gamificationService.updateStreakOnActivity(user.id, isPro);
      queryClient.setQueryData(['streak', user.id], updatedStreak);
    } catch (err) {
      console.error('[Gamification] Failed to update streak:', err);
    }
  }, [user, isPro, queryClient]);

  // ── Check achievements ──
  const checkAchievements = useCallback(async (codesRedeemed: number = 0) => {
    if (!user) return;
    try {
      const newlyUnlocked = await gamificationService.checkAndUnlockAchievements(user.id, {
        totalRatings,
        lovedCount,
        genresExplored,
        maxGenreCount,
        currentStreak: streak?.current_streak || 0,
        friendCount,
        watchlistCount,
        level,
        codesRedeemed,
      });

      if (newlyUnlocked.length > 0) {
        setNewlyUnlockedAchievements(prev => [...prev, ...newlyUnlocked]);
        // Show toast for each new achievement
        for (const achievement of newlyUnlocked) {
          const def = ACHIEVEMENTS.find(a => a.id === achievement.achievement_id);
          const tierDef = def?.tiers.find(t => t.tier === achievement.tier);
          if (def && tierDef) {
            toast.success(`Conquista desbloqueada: ${def.name} (${tierDef.tier})`, {
              icon: tierDef.icon,
              duration: 4000,
            });
          }
        }
        // Refresh achievements list
        queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
      }
    } catch (err) {
      console.error('[Gamification] Failed to check achievements:', err);
    }
  }, [user, totalRatings, lovedCount, genresExplored, maxGenreCount, streak, friendCount, watchlistCount, level, queryClient]);

  // ── Update challenge progress ──
  const updateChallengeProgress = useCallback(async (challengeKey: string, increment: number = 1) => {
    if (!user) return;
    try {
      const result = await gamificationService.updateChallengeProgress(user.id, challengeKey, increment);
      if (result?.is_completed) {
        toast.success(`Desafio completo! +${result.xp_reward} XP`, { icon: '🎯', duration: 4000 });
        queryClient.invalidateQueries({ queryKey: ['challenges', user.id] });
      }
    } catch (err) {
      console.error('[Gamification] Failed to update challenge:', err);
    }
  }, [user, queryClient]);

  // ── Streak info computed ──
  const streakInfo = streak ? {
    current: streak.current_streak,
    longest: streak.longest_streak,
    status: streak.streak_status,
    lastActivity: streak.last_activity_date,
    freezeCount: streak.streak_freeze_count,
    nextBonus: STREAK_CONFIG.BONUS_DAYS.find(d => d > streak.current_streak) || null,
    nextBonusXP: streak.current_streak < STREAK_CONFIG.BONUS_DAYS[0]
      ? STREAK_CONFIG.BONUS_XP[0]
      : STREAK_CONFIG.BONUS_XP[STREAK_CONFIG.BONUS_DAYS.findIndex(d => d > streak.current_streak)] || 0,
  } : null;

  // ── Achievement stats computed ──
  const achievementStats = {
    total: ACHIEVEMENTS.reduce((sum, a) => sum + a.tiers.length, 0),
    unlocked: achievements.length,
    byCategory: ACHIEVEMENTS.reduce((acc, a) => {
      if (!acc[a.category]) acc[a.category] = { total: 0, unlocked: 0 };
      acc[a.category].total += a.tiers.length;
      acc[a.category].unlocked += achievements.filter(ach => ach.achievement_id === a.id).length;
      return acc;
    }, {} as Record<string, { total: number; unlocked: number }>),
  };

  // ── Challenge stats computed ──
  const challengeStats = {
    active: challenges.filter(c => !c.is_completed).length,
    completed: challenges.filter(c => c.is_completed).length,
    totalXP: challenges.filter(c => c.is_completed).reduce((sum, c) => sum + c.xp_reward, 0),
    byType: {
      daily: challenges.filter(c => c.challenge_type === 'daily'),
      weekly: challenges.filter(c => c.challenge_type === 'weekly'),
      monthly: challenges.filter(c => c.challenge_type === 'monthly'),
    },
  };

  return {
    // Data
    streak,
    streakInfo,
    achievements,
    achievementStats,
    challenges,
    challengeStats,
    leaderboard,
    userRank,
    newlyUnlockedAchievements,
    
    // Actions
    recordActivity,
    checkAchievements,
    updateChallengeProgress,
    
    // Loading states
    isLoading: isStreakLoading || isAchievementsLoading || isChallengesLoading,
    isLeaderboardLoading,
    
    // Clear notifications
    clearNewAchievements: () => setNewlyUnlockedAchievements([]),
  };
}
