/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, type Dispatch, type SetStateAction, type MouseEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabaseService } from '../services/supabaseService';
import { LEVELS } from '../constants';
import { Movie, Rating, UserRating, WatchlistItem, UserProfile } from '../types';
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

interface UseRatingsReturn {
  ratings: UserRating[];
  setRatings: Dispatch<SetStateAction<UserRating[]>>;
  watchlist: WatchlistItem[];
  setWatchlist: Dispatch<SetStateAction<WatchlistItem[]>>;
  editingMovie: Movie | null;
  setEditingMovie: (movie: Movie | null) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  oracleResult: string | null;
  isOracleLoading: boolean;
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
  const [oracleResult, setOracleResult] = useState<string | null>(null);
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const [ratingAnimation, setRatingAnimation] = useState<RatingAnimation | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // ── Oracle mutation (replaces raw async calls in handleExportForAI / handleGroupExportForAI) ──
  const exportMutation = useMutation({
    mutationFn: (prompt: string) => supabaseService.askOracle(prompt),
    onSuccess: (result) => {
      setOracleResult(result);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setShowExportModal(false);
    },
    onSettled: () => {
      setIsOracleLoading(false);
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

      // XP Logic
      if (rating !== 'not_seen') {
        let xpGained = 0;
        if (rating === 'loved') xpGained = 20;
        else if (rating === 'liked') xpGained = 10;
        else if (rating === 'disliked') xpGained = 5;

        setUserProfile(prev => {
          const newXp = prev.xp + xpGained;
          let newLevel = prev.level;

          const nextLevelData = LEVELS.find(l => l.level === prev.level + 1);

          if (nextLevelData && newXp >= nextLevelData.xpRequired) {
            newLevel = nextLevelData.level;
            setNewLevelData(nextLevelData);
            setShowLevelUpModal(true);
          }

          if (user) {
            supabaseService.updateXp(user.id, newXp, newLevel).catch(() => {});
          }

          return { ...prev, xp: newXp, level: newLevel };
        });
      }

      // Visual feedback
      if (rating === 'loved') toast.success(`Você amou ${movie.title}! +20 XP`, { icon: '💖' });
      else if (rating === 'liked') toast.success(`Você gostou de ${movie.title} +10 XP`, { icon: '👍' });
      else if (rating === 'disliked') toast('Você não gostou +5 XP', { icon: '👎' });
      else toast('Ocultado', { icon: '🙈' });

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
    const shortText = `🎬 *${movie.title}*\n\n🍿 Encontrei essa recomendação no CineMatch! Descubra, avalie e salve filmes para assistir depois:\n${window.location.origin}`;

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
    setShowExportModal(true);
    setOracleResult(null);

    exportMutation.mutate(prompt);
  }, [isPro, ratings, onNavigateToPricing, exportMutation]);

  // ── Group export for AI (uses useMutation for the oracle call) ─────────
  const handleGroupExportForAI = useCallback(async () => {
    if (selectedFriends.length === 0) return;

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

      // Call Oracle AI for PRO users, copy to clipboard for free users
      if (isPro) {
        setIsOracleLoading(true);
        setShowExportModal(true);
        setOracleResult(null);
        exportMutation.mutate(prompt);
      } else {
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt copiado! Assine PRO para usar o Oráculo integrado.', { id: 'group-ai' });
      }
    } catch {
      toast.error('Erro ao gerar prompt', { id: 'group-ai' });
    }
  }, [selectedFriends, friends, ratings, watchlist, isPro, exportMutation]);

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
    isOracleLoading,
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
