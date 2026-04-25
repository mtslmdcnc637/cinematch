/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, type Dispatch, type SetStateAction, type MouseEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabaseService } from '../services/supabaseService';
import { gamificationService } from '../services/gamificationService';
import { fetchMovieById, searchMovies } from '../services/tmdbService';
import { LEVELS, getLevelForXP, calculateEffectiveXP, isLeagueTransition, getLeagueForLevel, getDailyRatingXPMultiplier, XP_SOURCES, ACHIEVEMENTS, TIER_LABELS } from '../constants';
import { Movie, Rating, UserRating, WatchlistItem, UserProfile, type OracleResult } from '../types';
import { toast } from 'sonner';

interface Friend {
  id: string;
  username?: string;
  [key: string]: unknown;
}

interface RatingAnimation {
  type: Rating;
  id: number;
}

interface UseRatingsParams {
  user: { id: string } | null;
  userProfile: UserProfile;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  setShowLevelUpModal: (show: boolean) => void;
  setNewLevelData: (data: { level: number; name: string; xpRequired: number; icon: string; color: string } | null) => void;
  incrementSwipes: () => Promise<boolean>;
  isPro: boolean;
  onNavigateToPricing: () => void;
  friends: Friend[];
}

export type OracleMode = 'personal' | 'group';

interface UseRatingsReturn {
  ratings: UserRating[];
  setRatings: Dispatch<SetStateAction<UserRating[]>>;
  watchlist: WatchlistItem[];
  setWatchlist: Dispatch<SetStateAction<WatchlistItem[]>>;
  editingMovie: Movie | null;
  setEditingMovie: (movie: Movie | null) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  oracleResult: OracleResult | null;
  oracleMovies: Movie[];
  isOracleLoading: boolean;
  oracleMode: OracleMode;
  ratingAnimation: RatingAnimation | null;
  selectedFriends: string[];
  setSelectedFriends: Dispatch<SetStateAction<string[]>>;
  saveRating: (movie: Movie, rating: Rating) => Promise<void>;
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (movieId: number, e?: MouseEvent) => void;
  handleShare: (movie: Movie) => Promise<void>;
  handleExportForAI: () => Promise<void>;
  handleGroupExportForAI: () => Promise<void>;
}

export function useRatings({
  user,
  userProfile,
  setUserProfile,
  setShowLevelUpModal,
  setNewLevelData,
  incrementSwipes,
  isPro,
  onNavigateToPricing,
  friends,
}: UseRatingsParams): UseRatingsReturn {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [oracleResult, setOracleResult] = useState<OracleResult | null>(null);
  const [oracleMovies, setOracleMovies] = useState<Movie[]>([]);
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const [oracleMode, setOracleMode] = useState<OracleMode>('personal');
  const [ratingAnimation, setRatingAnimation] = useState<RatingAnimation | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // ── Oracle mutation ──────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: (prompt: string) => supabaseService.askOracle(prompt),
    onSuccess: async (result) => {
      // result is now a structured OracleResult object (or fallback with fallback_text)
      setOracleResult(result);

      // Fetch TMDB data for each recommended movie
      if (result.movies && result.movies.length > 0) {
        try {
          const moviePromises = result.movies.map(async (rec) => {
            try {
              // Strategy 1: Try TMDB ID first (most accurate)
              if (rec.tmdb_id && rec.tmdb_id > 0) {
                const movie = await fetchMovieById(rec.tmdb_id) as any;
                // Validate: ensure the returned movie title roughly matches
                if (movie?.title) {
                  const normalTitle = rec.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const normalFetched = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (normalFetched.includes(normalTitle) || normalTitle.includes(normalFetched)) {
                    return movie as unknown as Movie;
                  }
                  // TMDB ID returned wrong movie — fall through to title search
                  console.warn(`[Oracle] TMDB ID ${rec.tmdb_id} returned "${movie.title}" instead of "${rec.title}", falling back to title search`);
                }
              }

              // Strategy 2: Search by title + year (more reliable for older/foreign films)
              const query = rec.year ? `${rec.title} ${rec.year}` : rec.title;
              const results = await searchMovies(query);
              const recTitle = rec.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              const match = results.find((r: any) => {
                const rTitle = r.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
                return rTitle.includes(recTitle) || recTitle.includes(rTitle);
              });
              if (match) return match as unknown as Movie;

              // Strategy 3: Search by title only (without year, broader match)
              if (rec.year) {
                const broaderResults = await searchMovies(rec.title);
                const broaderMatch = broaderResults.find((r: any) => {
                  const rTitle = r.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
                  return rTitle.includes(recTitle) || recTitle.includes(rTitle);
                });
                if (broaderMatch) return broaderMatch as unknown as Movie;
              }

              // No TMDB match found — return a synthetic Movie from AI data
              return {
                id: rec.tmdb_id || 0,
                title: rec.title,
                poster_path: '',
                release_date: rec.year ? `${rec.year}-01-01` : '',
                genre_ids: [],
                overview: rec.reason,
                vote_average: 0,
              } as Movie;
            } catch {
              // TMDB fetch failed — return synthetic Movie from AI data
              return {
                id: rec.tmdb_id || 0,
                title: rec.title,
                poster_path: '',
                release_date: rec.year ? `${rec.year}-01-01` : '',
                genre_ids: [],
                overview: rec.reason,
                vote_average: 0,
              } as Movie;
            }
          });
          const movies = await Promise.all(moviePromises);
          setOracleMovies(movies.filter(Boolean) as Movie[]);
        } catch {
          // TMDB fetch failed — Oracle text will still be displayed
        }
      }
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      console.error('[Oracle] Error:', msg);

      // Distinguish real auth failures (from refresh mechanism) from edge function errors
      // invokeEdgeFunction prefixes edge function errors with [HTTP NNN]
      // Auth failures from refresh mechanism do NOT have this prefix
      const isAuthFailure = !msg.startsWith('[HTTP') && (
        msg.includes('No active session') ||
        msg.includes('Session expired and could not be refreshed') ||
        msg.includes('Authentication failed — please log in again')
      );
      const httpStatus = msg.match(/^\[HTTP (\d+)\]/)?.[1];

      if (isAuthFailure) {
        toast.error('Sessão expirada. Faça login novamente para usar o Oráculo.', { duration: 6000 });
      } else if (httpStatus === '403') {
        toast.error('Assinatura PRO necessária. Redirecionando para os planos...', { duration: 4000 });
        onNavigateToPricing();
      } else if (httpStatus === '429' || msg.includes('Limite de consultas')) {
        toast.error('Limite de consultas atingido. Aguarde alguns minutos e tente novamente.', { duration: 6000 });
      } else if (msg.includes('OPENROUTER_API_KEY') || msg.includes('not configured')) {
        toast.error('Serviço de IA temporariamente indisponível. Tente novamente mais tarde.', { duration: 6000 });
      } else {
        // Extract clean message from [HTTP NNN] prefix
        const cleanMsg = msg.replace(/^\[HTTP \d+\]\s*/, '');
        toast.error(`Erro ao consultar o Oráculo: ${cleanMsg || msg}`, { duration: 6000 });
      }
      setShowExportModal(false);
    },
    onSettled: () => {
      setIsOracleLoading(false);
      // Dismiss any lingering loading toasts (e.g. 'group-ai')
      toast.dismiss('group-ai');
    },
  });

  const saveRating = useCallback(
    async (movie: Movie, rating: Rating) => {
      // Check limits for free users
      if (rating !== 'not_seen') {
        const canSwipe = await incrementSwipes();
        if (!canSwipe) {
          toast.error('Limite diário de swipes atingido! Assine o PRO para continuar.', { id: 'limit-swipe' });
          onNavigateToPricing();
          return;
        }
      }

      const newRatings = [
        ...ratings.filter(r => r.movieId !== movie.id),
        { movieId: movie.id, rating, timestamp: Date.now(), movie },
      ];
      setRatings(newRatings);

      // Remove from watchlist if present
      if (watchlist.some(w => w.movieId === movie.id)) {
        const newWatchlist = watchlist.filter(w => w.movieId !== movie.id);
        setWatchlist(newWatchlist);

        if (user) {
          supabaseService.removeFromWatchlist(user.id, movie.id).catch(() => {});
        }
      }

      // Sync with Supabase
      if (user) {
        supabaseService.saveRating(user.id, movie, rating).catch(() => {});
        if (userProfile.username && (rating === 'loved' || rating === 'liked')) {
          supabaseService
            .notifyFriends(user.id, userProfile.username, movie.title, rating)
            .catch(() => {});
        }
      }

      // XP Logic — Gamification v3 with soft cap + league multipliers
      if (rating !== 'not_seen') {
        let baseXP = 0;
        if (rating === 'loved') baseXP = XP_SOURCES.RATING_LOVED;
        else if (rating === 'liked') baseXP = XP_SOURCES.RATING_LIKED;
        else if (rating === 'disliked') baseXP = XP_SOURCES.RATING_DISLIKED;

        setUserProfile(prev => {
          // Apply league multiplier + PRO bonus
          let xpGained = calculateEffectiveXP(baseXP, prev.level, isPro);

          // Soft cap: check daily rating count and apply multiplier
          if (user) {
            gamificationService.getDailyXPTracking(user.id).then(tracking => {
              const ratingsToday = tracking?.rating_count || 0;
              const softCapMultiplier = getDailyRatingXPMultiplier(ratingsToday, isPro);
              if (softCapMultiplier < 1.0 && softCapMultiplier > 0) {
                // Partial XP — apply soft cap
                xpGained = Math.floor(xpGained * softCapMultiplier);
              } else if (softCapMultiplier === 0) {
                // Zero XP from ratings (cap exceeded)
                xpGained = 0;
              }
            }).catch(() => {}); // Fail open — don't block rating on tracking error
          }

          const newXp = prev.xp + xpGained;

          // CASCADE FIX: Find highest level reached (not just level+1)
          const reachedLevel = getLevelForXP(newXp);
          const newLevel = Math.max(prev.level, reachedLevel);
          const leveledUp = newLevel > prev.level;

          if (leveledUp) {
            const newLevelData = LEVELS.find(l => l.level === newLevel)!;
            setNewLevelData(newLevelData);
            setShowLevelUpModal(true);
          }

          if (user) {
            supabaseService.updateXp(user.id, newXp, newLevel).catch(() => {});
            // Track daily XP for soft cap
            if (xpGained > 0) {
              gamificationService.trackRatingXP(user.id, xpGained).catch(() => {});
            }
            // Update streak on activity
            gamificationService.updateStreakOnActivity(user.id, isPro).catch(() => {});
            // Update challenge progress for rating challenges
            gamificationService.updateChallengeProgress(user.id, 'daily_rate_3').catch(() => {});
            gamificationService.updateChallengeProgress(user.id, 'daily_rate_5').catch(() => {});
            gamificationService.updateChallengeProgress(user.id, 'daily_rate_8').catch(() => {});
            if (rating === 'loved') {
              gamificationService.updateChallengeProgress(user.id, 'daily_love_2').catch(() => {});
            }
            gamificationService.updateChallengeProgress(user.id, 'weekly_rate_15').catch(() => {});
            gamificationService.updateChallengeProgress(user.id, 'weekly_rate_25').catch(() => {});
            gamificationService.updateChallengeProgress(user.id, 'monthly_rate_50').catch(() => {});
            gamificationService.updateChallengeProgress(user.id, 'monthly_rate_100').catch(() => {});
            // Check and unlock achievements (fire-and-forget)
            gamificationService.checkAndUnlockAchievements(user.id, {
              totalRatings: newRatings.length,
              lovedCount: newRatings.filter(r => r.rating === 'loved').length,
              genresExplored: new Set(newRatings.flatMap(r => r.movie?.genre_ids || [])).size,
              maxGenreCount: Math.max(0, ...Object.values(newRatings.reduce((acc, r) => {
                (r.movie?.genre_ids || []).forEach(id => { acc[id] = (acc[id] || 0) + 1; });
                return acc;
              }, {} as Record<number, number>))),
              currentStreak: 0, // Will be checked separately
              friendCount: 0,
              watchlistCount: 0,
              level: newLevel,
              codesRedeemed: 0,
            }).then(newlyUnlocked => {
              if (newlyUnlocked.length > 0) {
                for (const achievement of newlyUnlocked) {
                  const def = ACHIEVEMENTS.find(a => a.id === achievement.achievement_id);
                  const tierDef = def?.tiers.find(t => t.tier === achievement.tier);
                  if (def && tierDef) {
                    toast.success(`Conquista desbloqueada: ${def.name} (${TIER_LABELS[tierDef.tier]})`, {
                      icon: tierDef.icon,
                      duration: 4000,
                    });
                  }
                }
              }
            }).catch(err => console.error('[Gamification] Failed to check achievements:', err));
          }

          return { ...prev, xp: newXp, level: newLevel };
        });
      }

      // Visual feedback with effective XP shown
      if (rating !== 'not_seen') {
        const effectiveXP = calculateEffectiveXP(
          rating === 'loved' ? XP_SOURCES.RATING_LOVED : rating === 'liked' ? XP_SOURCES.RATING_LIKED : XP_SOURCES.RATING_DISLIKED,
          userProfile.level,
          isPro
        );
        const league = getLeagueForLevel(userProfile.level);
        const multiplierText = league.xpMultiplier > 1 ? ` (${league.xpMultiplier}x ${league.name})` : '';

        if (rating === 'loved') toast.success(`Você amou ${movie.title}! +${effectiveXP} XP${multiplierText}`, { icon: '💖' });
        else if (rating === 'liked') toast.success(`Você gostou de ${movie.title} +${effectiveXP} XP${multiplierText}`, { icon: '👍' });
        else if (rating === 'disliked') toast(`Você não gostou +${effectiveXP} XP${multiplierText}`, { icon: '👎' });
      } else {
        toast('Ocultado', { icon: '🙈' });
      }

      if (rating !== 'not_seen') {
        setRatingAnimation({ type: rating, id: Date.now() });
        setTimeout(() => setRatingAnimation(null), 1500);
      }

      if (editingMovie?.id === movie.id) {
        setEditingMovie(null);
      }
    },
    [ratings, watchlist, user, userProfile, editingMovie, incrementSwipes, isPro, onNavigateToPricing, setUserProfile, setShowLevelUpModal, setNewLevelData]
  );

  const addToWatchlist = useCallback(
    (movie: Movie) => {
      if (!watchlist.some(w => w.movieId === movie.id)) {
        const newWatchlist = [...watchlist, { movieId: movie.id, timestamp: Date.now(), movie }];
        setWatchlist(newWatchlist);
        toast.success(`${movie.title} adicionado para ver depois!`, { icon: '🔖' });

        if (user) {
          supabaseService.addToWatchlist(user.id, movie).catch(() => {});
        }
      }
    },
    [watchlist, user]
  );

  const removeFromWatchlist = useCallback(
    (movieId: number, e?: MouseEvent) => {
      e?.stopPropagation();
      const newWatchlist = watchlist.filter(w => w.movieId !== movieId);
      setWatchlist(newWatchlist);
      toast('Removido da sua lista');

      if (user) {
        supabaseService.removeFromWatchlist(user.id, movieId).catch(() => {});
      }
    },
    [watchlist, user]
  );

  const handleShare = useCallback(async (movie: Movie) => {
    const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    const shortText = `🎬 *${movie.title}*\n\n🍿 Encontrei essa recomendação no MrCine! Descubra, avalie e salve filmes para assistir depois:\n${window.location.origin}`;

    let shared = false;

    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      const blob = await response.blob();
      const file = new File([blob], 'poster.jpg', { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: movie.title,
          text: shortText,
          files: [file],
        });
        shared = true;
      }
    } catch {
      // Fall through to text-only sharing
    }

    if (!shared) {
      const fallbackText = `${shortText}\n\n${imageUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: movie.title,
            text: fallbackText,
          });
          shared = true;
        } catch {
          // Fall through to clipboard
        }
      }

      if (!shared) {
        navigator.clipboard.writeText(fallbackText);
        toast.success('Texto copiado para a área de transferência!');
      }
    }
  }, []);

  // ── Export for AI (uses useMutation instead of raw async) ──────────────
  const handleExportForAI = useCallback(async () => {
    if (!isPro) {
      toast.error('O Oráculo de IA é exclusivo para assinantes PRO.', { id: 'limit-oracle' });
      onNavigateToPricing();
      return;
    }

    const exportData = {
      amei: ratings.filter(r => r.rating === 'loved').map(r => r.movie?.title).filter(Boolean) as string[],
      gostei: ratings.filter(r => r.rating === 'liked').map(r => r.movie?.title).filter(Boolean) as string[],
      nao_gostei: ratings.filter(r => r.rating === 'disliked').map(r => r.movie?.title).filter(Boolean) as string[],
    };

    const prompt = `Aqui está o meu histórico de filmes:
Amei: ${exportData.amei.join(', ')}
Gostei: ${exportData.gostei.join(', ')}
Não Gostei: ${exportData.nao_gostei.join(', ')}

Com base nisso, me recomende 3 filmes que não estão nessa lista.`;

    setIsOracleLoading(true);
    setOracleMode('personal');
    setShowExportModal(true);
    setOracleResult(null);
    setOracleMovies([]);

    exportMutation.mutate(prompt);
  }, [isPro, ratings, onNavigateToPricing, exportMutation]);

  // ── Group export for AI (uses useMutation for the oracle call) ─────────
  const handleGroupExportForAI = useCallback(async () => {
    if (selectedFriends.length === 0) return;

    // Block free users upfront — no point fetching friend tastes if they can't use it
    if (!isPro) {
      toast.error('A resolução de conflitos é exclusiva para assinantes PRO.', { id: 'limit-oracle' });
      onNavigateToPricing();
      return;
    }

    toast.loading('Analisando gostos do grupo...', { id: 'group-ai' });

    try {
      const groupTastes = await Promise.all(
        selectedFriends.map(async (friendId) => {
          const friend = friends.find(f => f.id === friendId);
          const tastes = await supabaseService.getFriendTastes(friendId);
          return {
            name: friend?.username || 'Amigo',
            amei: tastes?.ratings.filter(r => r.rating === 'loved').map(r => r.movie.title) || [],
            gostei: tastes?.ratings.filter(r => r.rating === 'liked').map(r => r.movie.title) || [],
            nao_gostei: tastes?.ratings.filter(r => r.rating === 'disliked').map(r => r.movie.title) || [],
            ver_depois: tastes?.watchlist.map(w => w.movie.title) || [],
          };
        })
      );

      const myTastes = {
        name: 'Eu',
        amei: ratings.filter(r => r.rating === 'loved').map(r => r.movie?.title).filter(Boolean) as string[],
        gostei: ratings.filter(r => r.rating === 'liked').map(r => r.movie?.title).filter(Boolean) as string[],
        nao_gostei: ratings.filter(r => r.rating === 'disliked').map(r => r.movie?.title).filter(Boolean) as string[],
        ver_depois: watchlist.map(w => w.movie?.title).filter(Boolean) as string[],
      };

      const allTastes = [myTastes, ...groupTastes];

      let prompt = 'Olá! Somos um grupo de amigos querendo assistir um filme juntos. Aqui estão nossos gostos:\n\n';

      allTastes.forEach(person => {
        prompt += `--- ${person.name} ---\n`;
        if (person.amei.length > 0) prompt += `Amei: ${person.amei.join(', ')}\n`;
        if (person.gostei.length > 0) prompt += `Gostei: ${person.gostei.join(', ')}\n`;
        if (person.nao_gostei.length > 0) prompt += `Não Gostei: ${person.nao_gostei.join(', ')}\n`;
        if (person.ver_depois.length > 0) prompt += `Ver Depois: ${person.ver_depois.join(', ')}\n`;
        prompt += '\n';
      });

      prompt += 'Com base nisso, sugira 5 filmes que todos nós provavelmente gostaríamos. Explique por que cada filme é uma boa escolha para o grupo, focando nos pontos em comum dos nossos gostos.';

      // Call Oracle AI (isPro already checked above)
      setIsOracleLoading(true);
      setOracleMode('group');
      setShowExportModal(true);
      setOracleResult(null);
      setOracleMovies([]);
      exportMutation.mutate(prompt);
    } catch {
      toast.error('Erro ao gerar prompt', { id: 'group-ai' });
    }
  }, [selectedFriends, friends, ratings, watchlist, isPro, exportMutation, onNavigateToPricing]);

  return {
    ratings,
    setRatings,
    watchlist,
    setWatchlist,
    editingMovie,
    setEditingMovie,
    showExportModal,
    setShowExportModal,
    oracleResult,
    oracleMovies,
    isOracleLoading,
    oracleMode,
    ratingAnimation,
    selectedFriends,
    setSelectedFriends,
    saveRating,
    addToWatchlist,
    removeFromWatchlist,
    handleShare,
    handleExportForAI,
    handleGroupExportForAI,
  };
}
