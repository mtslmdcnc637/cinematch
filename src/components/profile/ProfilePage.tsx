/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Bot, Sparkles, Lock, Camera, Loader2, Trophy, Flame, Target, Medal, Swords, Crown, Star } from 'lucide-react';
import { UserProfile, UserRating, WatchlistItem, type OracleResult, type Movie, type UserAchievement, type UserStreak, type UserChallenge } from '../../types';
import { GENRES, LEVELS, ACHIEVEMENTS, TIER_LABELS, TIER_COLORS, TIER_BORDER, LEAGUES, CHALLENGE_RARITY_ICONS, CHALLENGE_RARITY_COLORS, getLeagueForLevel } from '../../constants';
import { gamificationService } from '../../services/gamificationService';
import { ProBadge, ProAvatarBorder } from '../common/ProBadge';
import { toast } from 'sonner';
import { supabaseService } from '../../services/supabaseService';

interface ProfilePageProps {
  userProfile: UserProfile;
  ratings: UserRating[];
  watchlist: WatchlistItem[];
  isPro: boolean;
  planType: string;
  onSignOut: () => void;
  handleExportForAI: () => void;
  oracleResult: OracleResult | null;
  oracleMovies?: Movie[];
  isOracleLoading: boolean;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  subscriptionStatus?: any;
  user?: any;
  authEmail?: string;
  setAuthEmail?: (email: string) => void;
  authPassword?: string;
  setAuthPassword?: (password: string) => void;
  authUsername?: string;
  setAuthUsername?: (username: string) => void;
  isSignUp?: boolean;
  setIsSignUp?: (isSignUp: boolean) => void;
  isAuthLoading?: boolean;
  handleEmailAuth?: (e: React.FormEvent | undefined) => void;
  handleGoogleAuth?: () => void;
  selectedGenres?: number[];
  onEditGenres?: () => void;
  notificationPrefs?: Record<string, boolean>;
  onUpdatePreference: (key: string, value: boolean) => void;
  avatarUrl?: string | null;
  isPublicProfile?: boolean;
  onProfileUpdate?: () => void;
}

type ProfileTab = 'conquistas' | 'desafios' | 'sequencia' | 'liga';

const ACHIEVEMENT_CATEGORIES = [
  { id: 'ratings', label: 'Avaliações', icon: '🎬' },
  { id: 'genres', label: 'Gêneros', icon: '🎭' },
  { id: 'streaks', label: 'Sequência', icon: '🔥' },
  { id: 'social', label: 'Social', icon: '🤝' },
  { id: 'collection', label: 'Coleção', icon: '📚' },
  { id: 'leagues', label: 'Ligas', icon: '⭐' },
  { id: 'codes', label: 'Códigos', icon: '🔑' },
] as const;

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  ratings,
  watchlist,
  isPro,
  planType,
  onSignOut,
  handleExportForAI,
  oracleResult,
  isOracleLoading,
  showExportModal,
  setShowExportModal,
  user,
  authEmail = '',
  setAuthEmail = () => {},
  authPassword = '',
  setAuthPassword = () => {},
  authUsername = '',
  setAuthUsername = () => {},
  isSignUp = false,
  setIsSignUp = () => {},
  isAuthLoading = false,
  handleEmailAuth,
  handleGoogleAuth,
  selectedGenres = [],
  onEditGenres = () => {},
  notificationPrefs = {},
  onUpdatePreference,
  avatarUrl,
  isPublicProfile = false,
  onProfileUpdate = () => {},
}) => {
  const navigate = useNavigate();
  const currentLevelData = LEVELS.find(l => l.level === userProfile.level);
  const nextLevelData = LEVELS.find(l => l.level === userProfile.level + 1);
  const currentLeague = getLeagueForLevel(userProfile.level);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(avatarUrl || null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('conquistas');
  const [achievementCategory, setAchievementCategory] = useState<string>('all');

  // Achievements state
  const [userAchievements, setUserAchievements] = React.useState<UserAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = React.useState(true);

  // Streak state
  const [streak, setStreak] = React.useState<UserStreak | null>(null);
  const [isLoadingStreak, setIsLoadingStreak] = React.useState(true);

  // Challenges state
  const [challenges, setChallenges] = React.useState<UserChallenge[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = React.useState(true);

  // Fetch all gamification data when user is logged in
  React.useEffect(() => {
    if (!user?.id) {
      setIsLoadingAchievements(false);
      setIsLoadingStreak(false);
      setIsLoadingChallenges(false);
      return;
    }

    gamificationService.getAchievements(user.id)
      .then(setUserAchievements)
      .catch(() => {})
      .finally(() => setIsLoadingAchievements(false));

    gamificationService.getStreak(user.id)
      .then(setStreak)
      .catch(() => {})
      .finally(() => setIsLoadingStreak(false));

    gamificationService.getChallenges(user.id)
      .then(setChallenges)
      .catch(() => {})
      .finally(() => setIsLoadingChallenges(false));
  }, [user?.id]);

  // Build achievements display map - keep highest tier per achievement
  const achievementDisplayMap = React.useMemo(() => {
    const tierOrder = ['bronze', 'silver', 'gold', 'diamond'];
    const bestMap: Record<string, { tier: string; unlockedAt: string }> = {};
    for (const ua of userAchievements) {
      const existing = bestMap[ua.achievement_id];
      if (!existing || tierOrder.indexOf(ua.tier) > tierOrder.indexOf(existing.tier)) {
        bestMap[ua.achievement_id] = { tier: ua.tier, unlockedAt: ua.unlocked_at };
      }
    }
    return bestMap;
  }, [userAchievements]);

  // Filter achievements by category
  const filteredAchievements = React.useMemo(() => {
    if (achievementCategory === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === achievementCategory);
  }, [achievementCategory]);

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto w-full"
    >
      <div className="text-center mb-12">
        {/* Avatar with upload overlay */}
        <div className="relative inline-block mb-6">
          {isPro ? (
            <ProAvatarBorder className="mx-auto w-32 h-32">
              <div className="w-full h-full rounded-full glass-card flex items-center justify-center bg-[#030303] border-2 border-transparent overflow-hidden">
                {localAvatarUrl ? (
                  <img src={localAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </ProAvatarBorder>
          ) : (
            <div className="w-32 h-32 mx-auto rounded-full glass-card flex items-center justify-center border-2 border-purple-500/30 relative overflow-hidden">
              {localAvatarUrl ? (
                <img src={localAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
              {isPro && (
                <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  PRO
                </div>
              )}
            </div>
          )}

          {/* Camera overlay button */}
          {user && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className={`absolute w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-[#030303] disabled:opacity-50 z-20 ${
                isPro ? 'bottom-3 right-0' : 'bottom-1 right-1'
              }`}
              title="Alterar avatar"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !user?.id) return;
              if (file.size > 2 * 1024 * 1024) {
                toast.error('Imagem muito grande. Máximo 2MB.');
                return;
              }
              setIsUploadingAvatar(true);
              try {
                const publicUrl = await supabaseService.uploadAvatar(user.id, file);
                if (publicUrl) {
                  setLocalAvatarUrl(publicUrl);
                  toast.success('Avatar atualizado!');
                  onProfileUpdate();
                }
              } catch (err) {
                toast.error('Erro ao fazer upload do avatar');
                console.error(err);
              } finally {
                setIsUploadingAvatar(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
        </div>

        {user ? (
          <>
            <h2 className="text-4xl font-bold tracking-tight font-display mb-2">
              {userProfile.username || 'Cinéfilo'}
              {isPro && <ProBadge size="md" className="ml-2 align-middle" />}
            </h2>
            <p className="text-gray-400 mb-6">{user.email}</p>

            {/* Level Progress */}
            <div className="max-w-md mx-auto mb-8 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-amber-500 rounded-[2rem] opacity-30 group-hover:opacity-60 transition duration-500 blur" />
              <div className="relative glass-card p-6 rounded-3xl border border-white/10 bg-[#111]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${currentLevelData?.color || 'from-gray-500 to-gray-400'} flex items-center justify-center text-3xl shadow-lg border border-white/10`}
                    >
                      {currentLevelData?.icon || '🌱'}
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Nível {userProfile.level}</p>
                      <p className="font-bold text-xl text-white">{currentLevelData?.name || 'Novato'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                      {userProfile.xp} <span className="text-sm text-gray-400 font-sans font-normal">XP</span>
                    </p>
                  </div>
                </div>

                {userProfile.level < 30 && nextLevelData && (
                  <>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, ((userProfile.xp - (currentLevelData?.xpRequired || 0)) / (nextLevelData.xpRequired - (currentLevelData?.xpRequired || 0))) * 100)}%`,
                        }}
                        className={`h-full bg-gradient-to-r ${nextLevelData.color}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right">
                      Faltam {nextLevelData.xpRequired - userProfile.xp} XP para o nível {userProfile.level + 1}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="bg-white/10 text-white font-bold py-2 px-6 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center gap-2 mx-auto border border-white/10"
            >
              Sair da conta
            </button>
          </>
        ) : (
          <div className="max-w-md mx-auto w-full glass-card p-8 rounded-[2rem] border border-white/10 text-left">
            <h2 className="text-3xl font-bold font-display mb-2 text-center">
              Bem-vindo de volta
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Entre para acessar sua biblioteca
            </p>

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <div>
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => window.location.href = 'https://quiz.mrcine.pro'}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Não tem conta? Faça o quiz e cadastre-se
              </button>
            </div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">ou</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Entrar com Google
            </button>
          </div>
        )}
      </div>

      {user && (
      <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-5xl font-bold text-white mb-2 font-display">{ratings.length}</h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Avaliados</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-5xl font-bold text-white mb-2 font-display">
            {ratings.filter(r => r.rating === 'loved').length}
          </h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Favoritos</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-2xl font-bold text-white mb-2 font-display mt-3">{
            (() => {
              const genreCounts: Record<number, number> = {};
              ratings.forEach(r => {
                if (r.movie?.genre_ids) {
                  r.movie.genre_ids.forEach(id => {
                    genreCounts[id] = (genreCounts[id] || 0) + 1;
                  });
                }
              });
              const topGenreId = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
              const topGenre = topGenreId ? GENRES.find(g => g.id === Number(topGenreId)) : null;
              return topGenre?.name || '—';
            })()
          }</h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Gênero Top</p>
        </div>
      </div>

      {/* Genres + Oracle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-card rounded-[2rem] p-8">
          <h3 className="text-2xl font-bold mb-6 font-display">Gêneros Selecionados</h3>
          <div className="flex flex-wrap gap-3">
            {GENRES.filter(g => selectedGenres.includes(g.id)).map(genre => (
              <div key={genre.id} className="bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10">
                {genre.name}
              </div>
            ))}
            <button
              onClick={onEditGenres}
              className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-white/30 text-gray-400 hover:text-white hover:border-white/60 transition-colors"
            >
              + Editar
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
          <Bot className="w-12 h-12 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2 font-display flex items-center gap-2">
            Oráculo de IA
            {!isPro && <ProBadge size="sm" />}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Deixe a Inteligência Artificial encontrar o filme perfeito com base no seu gosto.
          </p>
          <button
            onClick={handleExportForAI}
            className={`w-full text-white font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 ${
              isPro
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : 'bg-white/10 hover:bg-white/20 border border-white/10'
            }`}
          >
            {isPro ? <Sparkles className="w-5 h-5" /> : <Lock className="w-4 h-4 text-gray-400" />}
            {isPro ? 'Consultar Oráculo' : 'Desbloquear Oráculo'}
          </button>
        </div>
      </div>

      {/* ── Tabbed Gamification Section ── */}
      <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 mb-12">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'conquistas' as ProfileTab, label: 'Conquistas', icon: Trophy, color: 'text-amber-400' },
            { id: 'desafios' as ProfileTab, label: 'Desafios', icon: Target, color: 'text-blue-400' },
            { id: 'sequencia' as ProfileTab, label: 'Sequência', icon: Flame, color: 'text-orange-400' },
            { id: 'liga' as ProfileTab, label: 'Liga', icon: Medal, color: 'text-purple-400' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Conquistas ── */}
        {activeTab === 'conquistas' && (
          <div>
            {/* Achievement category filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setAchievementCategory('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  achievementCategory === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                Todas ({userAchievements.length})
              </button>
              {ACHIEVEMENT_CATEGORIES.map(cat => {
                const count = userAchievements.filter(a => ACHIEVEMENTS.find(ac => ac.id === a.achievement_id)?.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setAchievementCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      achievementCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat.icon} {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {isLoadingAchievements ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-2xl p-5 animate-pulse border border-white/10 bg-white/5">
                    <div className="w-12 h-12 bg-white/10 rounded-full mx-auto mb-3" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredAchievements.map(ach => {
                  const unlocked = achievementDisplayMap[ach.id];
                  const bestTier = unlocked?.tier;
                  const highestUnlockedTier = bestTier
                    ? ach.tiers.find(t => t.tier === bestTier)
                    : null;
                  const nextTier = !bestTier
                    ? ach.tiers[0]
                    : ach.tiers[ach.tiers.indexOf(highestUnlockedTier!) + 1];

                  return (
                    <div
                      key={ach.id}
                      className={`rounded-2xl p-5 text-center relative overflow-hidden transition-all bg-white/[0.03] ${
                        highestUnlockedTier
                          ? 'border ' + (TIER_BORDER[highestUnlockedTier.tier as keyof typeof TIER_BORDER] || 'border-white/10')
                          : 'border border-white/5 opacity-40'
                      }`}
                    >
                      {highestUnlockedTier && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${TIER_COLORS[highestUnlockedTier.tier as keyof typeof TIER_COLORS]} opacity-5`} />
                      )}
                      <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${
                          highestUnlockedTier
                            ? 'bg-gradient-to-br ' + (TIER_COLORS[highestUnlockedTier.tier as keyof typeof TIER_COLORS])
                            : 'bg-white/5'
                        }`}>
                          {highestUnlockedTier ? highestUnlockedTier.icon : '🔒'}
                        </div>
                        <p className="text-white text-sm font-bold mb-1">{ach.name}</p>
                        <p className="text-gray-400 text-xs mb-2">{ach.description}</p>
                        {highestUnlockedTier ? (
                          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r ${TIER_COLORS[highestUnlockedTier.tier as keyof typeof TIER_COLORS]} text-white`}>
                            {TIER_LABELS[highestUnlockedTier.tier as keyof typeof TIER_LABELS]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {nextTier ? `${nextTier.requirement} ${ach.id.includes('rating') || ach.id.includes('marathon') ? 'avaliações' : ach.id.includes('loved') ? 'ames' : ach.id.includes('genre') ? 'gêneros' : ach.id.includes('streak') ? 'dias' : ach.id.includes('social') || ach.id.includes('friend') ? 'amigos' : ach.id.includes('watchlist') ? 'filmes' : ach.id.includes('league') ? 'nível' : 'vezes'}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Desafios ── */}
        {activeTab === 'desafios' && (
          <div>
            {isLoadingChallenges ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-2xl p-6 animate-pulse border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-bold mb-2">Nenhum desafio ativo</p>
                <p className="text-gray-500 text-sm">Volte amanhã para novos desafios diários!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {challenges.map(ch => {
                  const progressPct = Math.min(100, (ch.progress / ch.target) * 100);
                  const rarityIcon = CHALLENGE_RARITY_ICONS[ch.rarity as keyof typeof CHALLENGE_RARITY_ICONS] || '⚪';
                  const rarityColor = CHALLENGE_RARITY_COLORS[ch.rarity as keyof typeof CHALLENGE_RARITY_COLORS] || 'text-gray-400';

                  return (
                    <div
                      key={ch.id}
                      className={`rounded-2xl p-5 border transition-all bg-white/[0.03] ${
                        ch.is_completed
                          ? 'border-green-500/30'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{rarityIcon}</span>
                          <div>
                            <p className={`text-sm font-bold ${ch.is_completed ? 'text-green-400' : 'text-white'}`}>
                              {ch.description}
                            </p>
                            <p className={`text-xs ${rarityColor}`}>
                              {ch.rarity === 'legendary' ? 'Lendário' : ch.rarity === 'epic' ? 'Épico' : ch.rarity === 'rare' ? 'Raro' : 'Comum'}
                              {' · '}
                              {ch.challenge_type === 'daily' ? 'Diário' : ch.challenge_type === 'weekly' ? 'Semanal' : 'Mensal'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 text-sm font-bold">+{ch.xp_reward} XP</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ch.is_completed
                              ? 'bg-green-500'
                              : 'bg-gradient-to-r from-purple-500 to-blue-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-right">
                        {ch.progress}/{ch.target} {ch.is_completed ? '✓' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Sequência (Streak) ── */}
        {activeTab === 'sequencia' && (
          <div>
            {isLoadingStreak ? (
              <div className="rounded-2xl p-8 animate-pulse border border-white/10 bg-white/5" />
            ) : !streak ? (
              <div className="text-center py-12">
                <Flame className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-bold mb-2">Sem sequência ainda</p>
                <p className="text-gray-500 text-sm">Avalie um filme hoje para começar sua sequência!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Streak main card */}
                <div className="rounded-2xl p-6 border border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                    <Flame className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-6xl font-bold text-white font-display mb-2">{streak.current_streak}</p>
                  <p className="text-gray-400 font-medium text-lg">dias consecutivos</p>
                  {streak.current_streak >= 7 && (
                    <div className="mt-4 inline-block bg-orange-500/20 px-4 py-2 rounded-full border border-orange-500/30">
                      <p className="text-orange-300 text-sm font-bold">🔥 Sequência de {streak.current_streak} dias!</p>
                    </div>
                  )}
                </div>

                {/* Streak stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.03] text-center">
                    <p className="text-3xl font-bold text-white font-display">{streak.longest_streak}</p>
                    <p className="text-gray-400 text-sm mt-1">Recorde pessoal</p>
                  </div>
                  <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.03] text-center">
                    <p className="text-3xl font-bold text-white font-display">{streak.streak_freeze_count}</p>
                    <p className="text-gray-400 text-sm mt-1">Congelamentos usados</p>
                  </div>
                </div>

                {/* Streak bonuses */}
                <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.03]">
                  <p className="text-white font-bold text-sm mb-3">Bônus de Sequência</p>
                  <div className="space-y-2">
                    {[
                      { days: 7, xp: 15, icon: '🔥' },
                      { days: 30, xp: 50, icon: '⚡' },
                      { days: 100, xp: 150, icon: '💫' },
                      { days: 365, xp: 500, icon: '🌟' },
                    ].map(bonus => {
                      const achieved = streak.current_streak >= bonus.days;
                      return (
                        <div key={bonus.days} className={`flex items-center justify-between py-2 px-3 rounded-xl ${achieved ? 'bg-green-500/10' : 'bg-white/[0.02]'}`}>
                          <div className="flex items-center gap-2">
                            <span>{bonus.icon}</span>
                            <span className={`text-sm ${achieved ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{bonus.days} dias</span>
                          </div>
                          <span className={`text-sm font-bold ${achieved ? 'text-green-400' : 'text-gray-500'}`}>+{bonus.xp} XP</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Liga ── */}
        {activeTab === 'liga' && (
          <div>
            {/* Current League */}
            <div className={`rounded-2xl p-6 border bg-gradient-to-br ${currentLeague.color} bg-opacity-5 text-center mb-6`} style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-4xl border border-white/10">
                {currentLeague.icon}
              </div>
              <p className="text-2xl font-bold text-white font-display mb-1">{currentLeague.name}</p>
              <p className="text-gray-400 text-sm">Nível {currentLeague.minLevel}–{currentLeague.maxLevel}</p>
              <div className="mt-4 inline-block bg-purple-500/20 px-4 py-2 rounded-full border border-purple-500/30">
                <p className="text-purple-300 text-sm font-bold">{currentLeague.xpMultiplier}x multiplicador de XP</p>
              </div>
              {isPro && (
                <div className="mt-2 inline-block bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30 ml-2">
                  <p className="text-amber-300 text-sm font-bold">+25% bônus PRO</p>
                </div>
              )}
            </div>

            {/* All Leagues */}
            <div className="space-y-3">
              {LEAGUES.map(league => {
                const isCurrent = currentLeague.id === league.id;
                const isPast = userProfile.level >= league.maxLevel;
                return (
                  <div
                    key={league.id}
                    className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
                      isCurrent
                        ? `border-purple-500/30 bg-gradient-to-r ${league.color} bg-opacity-5`
                        : isPast
                        ? 'border-white/10 bg-white/[0.03] opacity-60'
                        : 'border-white/5 bg-white/[0.02] opacity-30'
                    }`}
                    style={isCurrent ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{league.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{league.name}</p>
                        <p className="text-xs text-gray-500">Nível {league.minLevel}–{league.maxLevel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isCurrent ? 'text-purple-400' : 'text-gray-500'}`}>{league.xpMultiplier}x XP</p>
                      {isCurrent && <p className="text-xs text-purple-400">Atual</p>}
                      {isPast && <p className="text-xs text-green-400">✓ Completa</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </motion.div>
  );
};
