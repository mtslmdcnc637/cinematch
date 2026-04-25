import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Target, BarChart3, Lock, Check, ChevronRight, Snowflake, Star } from 'lucide-react';
import { ACHIEVEMENTS, TIER_COLORS, TIER_LABELS, TIER_BORDER, CHALLENGE_RARITY_ICONS, CHALLENGE_RARITY_COLORS, LEAGUES, getLeagueForLevel } from '../../constants';
import type { UserAchievement, UserChallenge, UserStreak, LeaderboardEntry, AchievementTier, ChallengeRarity } from '../../types';

interface GamificationPanelProps {
  achievements: UserAchievement[];
  streak: UserStreak | null;
  streakInfo: {
    current: number;
    longest: number;
    status: 'active' | 'frozen' | 'broken';
    nextBonus: number | null;
    nextBonusXP: number;
  } | null;
  challenges: UserChallenge[];
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  isPro: boolean;
  userId: string | undefined;
}

export const GamificationPanel: React.FC<GamificationPanelProps> = ({
  achievements,
  streak,
  streakInfo,
  challenges,
  leaderboard,
  userRank,
  isPro,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'streak' | 'challenges' | 'leaderboard'>('achievements');

  const tabs = [
    { id: 'achievements' as const, label: 'Conquistas', icon: Trophy },
    { id: 'streak' as const, label: 'Sequência', icon: Flame },
    { id: 'challenges' as const, label: 'Desafios', icon: Target },
    { id: 'leaderboard' as const, label: 'Ranking', icon: BarChart3 },
  ];

  // Build a set of unlocked achievement keys for quick lookup
  const unlockedSet = new Set(achievements.map(a => `${a.achievement_id}:${a.tier}`));

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {ACHIEVEMENTS.map(achievement => {
              const unlockedTiers = achievement.tiers.filter(t =>
                unlockedSet.has(`${achievement.id}:${t.tier}`)
              );
              const highestUnlocked = unlockedTiers[unlockedTiers.length - 1];
              const nextTier = achievement.tiers.find(t => !unlockedSet.has(`${achievement.id}:${t.tier}`));

              return (
                <div
                  key={achievement.id}
                  className={`glass-card rounded-2xl p-4 border transition-all ${
                    highestUnlocked ? TIER_BORDER[highestUnlocked.tier] : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{highestUnlocked?.icon || '🔒'}</span>
                      <div>
                        <p className="font-bold text-white text-sm">{achievement.name}</p>
                        <p className="text-xs text-gray-400">{achievement.description}</p>
                      </div>
                    </div>
                    {highestUnlocked && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${TIER_COLORS[highestUnlocked.tier]} text-white`}>
                        {TIER_LABELS[highestUnlocked.tier]}
                      </span>
                    )}
                  </div>

                  {/* Tier progress dots */}
                  <div className="flex gap-2 mt-2">
                    {achievement.tiers.map(tier => {
                      const isUnlocked = unlockedSet.has(`${achievement.id}:${tier.tier}`);
                      return (
                        <div
                          key={tier.tier}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                            isUnlocked
                              ? `bg-gradient-to-r ${TIER_COLORS[tier.tier]} text-white`
                              : 'bg-white/5 text-gray-500'
                          }`}
                          title={`${TIER_LABELS[tier.tier]}: ${tier.requirement}`}
                        >
                          {isUnlocked ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {TIER_LABELS[tier.tier]}
                        </div>
                      );
                    })}
                  </div>

                  {nextTier && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      Próximo: {TIER_LABELS[nextTier.tier]} ({nextTier.requirement})
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'streak' && (
          <motion.div
            key="streak"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Streak display */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 text-center">
              <div className={`text-6xl mb-3 ${streakInfo?.status === 'active' ? 'animate-pulse' : ''}`}>
                {streakInfo?.status === 'active' ? '🔥' : streakInfo?.status === 'frozen' ? '🧊' : '💨'}
              </div>
              <p className="text-4xl font-bold text-white font-display">
                {streakInfo?.current || 0}
              </p>
              <p className="text-gray-400 text-sm mt-1">dias de sequência</p>
              
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-400">{streakInfo?.longest || 0}</p>
                  <p className="text-xs text-gray-500">Recorde</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className={`text-lg font-bold ${streakInfo?.status === 'active' ? 'text-green-400' : streakInfo?.status === 'frozen' ? 'text-blue-400' : 'text-red-400'}`}>
                    {streakInfo?.status === 'active' ? 'Ativa' : streakInfo?.status === 'frozen' ? 'Congelada' : 'Quebrada'}
                  </p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
              </div>

              {streakInfo?.nextBonus && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-300">
                    Bonus em {streakInfo.nextBonus} dias: +{streakInfo.nextBonusXP} XP
                  </p>
                  <div className="w-full h-1.5 bg-black/30 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((streakInfo.current / streakInfo.nextBonus) * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {streakInfo?.status === 'frozen' && isPro && (
                <button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-full transition-colors flex items-center gap-2 mx-auto">
                  <Snowflake className="w-4 h-4" />
                  Usar Freeze ({3 - (streak?.streak_freeze_count || 0)} restantes)
                </button>
              )}

              {streakInfo?.status === 'frozen' && !isPro && (
                <p className="mt-3 text-xs text-gray-500">
                  Membros PRO podem congelar a sequência
                </p>
              )}
            </div>

            {/* Streak milestones */}
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-bold text-white mb-3">Marcos de Sequência</p>
              <div className="space-y-2">
                {[7, 30, 100, 365].map((days, i) => {
                  const xpBonuses = [15, 50, 150, 500];
                  const reached = (streakInfo?.current || 0) >= days;
                  return (
                    <div key={days} className={`flex items-center justify-between py-2 px-3 rounded-xl ${reached ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${reached ? '' : 'grayscale opacity-50'}`}>
                          {['🔥', '⚡', '💫', '🌟'][i]}
                        </span>
                        <span className={`text-sm ${reached ? 'text-white' : 'text-gray-500'}`}>{days} dias</span>
                      </div>
                      <span className={`text-sm font-bold ${reached ? 'text-amber-400' : 'text-gray-600'}`}>
                        +{xpBonuses[i]} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'challenges' && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {challenges.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/10">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum desafio ativo no momento</p>
                <p className="text-xs text-gray-600 mt-1">Novos desafios diários aparecem automaticamente</p>
              </div>
            ) : (
              challenges.map(challenge => {
                const progressPercent = Math.min(100, (challenge.progress / challenge.target) * 100);
                return (
                  <div
                    key={challenge.id}
                    className={`glass-card rounded-2xl p-4 border transition-all ${
                      challenge.is_completed ? 'border-green-500/30 bg-green-500/5' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={CHALLENGE_RARITY_COLORS[challenge.rarity as ChallengeRarity]}>
                          {CHALLENGE_RARITY_ICONS[challenge.rarity as ChallengeRarity]}
                        </span>
                        <span className="text-sm font-medium text-white">{challenge.description}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        challenge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-300' :
                        challenge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-300' :
                        challenge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        +{challenge.xp_reward} XP
                      </span>
                    </div>

                    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className={`h-full rounded-full ${
                          challenge.is_completed
                            ? 'bg-green-500'
                            : challenge.rarity === 'legendary' ? 'bg-yellow-500' :
                            challenge.rarity === 'epic' ? 'bg-purple-500' :
                            challenge.rarity === 'rare' ? 'bg-blue-500' :
                            'bg-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">
                        {challenge.progress}/{challenge.target}
                      </span>
                      <span className="text-xs text-gray-600 uppercase">{challenge.challenge_type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {/* User rank card */}
            {userRank && (
              <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏅</span>
                  <div>
                    <p className="text-sm text-gray-400">Sua posição</p>
                    <p className="text-2xl font-bold text-white">#{userRank}</p>
                  </div>
                </div>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/10">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Ranking indisponível no momento</p>
              </div>
            ) : (
              leaderboard.slice(0, 20).map((entry, index) => {
                const isCurrentUser = entry.id === userId;
                const league = getLeagueForLevel(entry.level);
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrentUser
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-8 text-center font-bold text-gray-400">
                      {medal || `${index + 1}`}
                    </span>
                    
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-500 flex items-center justify-center text-xs overflow-hidden">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{entry.username?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                        {entry.username || 'Anônimo'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Nível {entry.level} · {league.icon} {league.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{entry.xp.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">XP</p>
                    </div>

                    {entry.current_streak > 0 && (
                      <span className="text-xs text-amber-400">🔥{entry.current_streak}</span>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
