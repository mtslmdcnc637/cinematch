/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '../services/supabaseService';
import { GENRES } from '../constants';
import { Movie, UserRating, WatchlistItem } from '../types';
import { toast } from 'sonner';

interface MovieProvider {
  link?: string;
  flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
}

interface TmdbProvidersResponse {
  results?: {
    BR?: MovieProvider;
    [key: string]: MovieProvider | undefined;
  };
}

// TMDB fetch via Supabase Edge Function (tmdb-proxy)
// Uses invokeEdgeFunction instead of supabase.functions.invoke() to avoid
// the SDK's internal session race condition that causes 401 errors.
import { invokeEdgeFunction } from '../lib/edgeFunction';

async function tmdbFetch<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  return invokeEdgeFunction<T>('tmdb-proxy', { endpoint, params });
}

interface UseMoviesParams {
  user: { id: string } | null;
  ratings: UserRating[];
  watchlist: WatchlistItem[];
  selectedGenres: number[];
  currentPage: string;
  incrementDicas: () => Promise<boolean>;
  onNavigateToPricing: () => void;
}

interface UseMoviesReturn {
  movies: Movie[];
  setMovies: Dispatch<SetStateAction<Movie[]>>;
  feedPage: number;
  activeGenre: number | null;
  setActiveGenre: (genre: number | null) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Movie[];
  isSearching: boolean;
  currentMovie: Movie | undefined;
  dailyTip: Movie | null;
  dailyTipReason: string;
  dailyTipGenre: number | null;
  setDailyTipGenre: (genre: number | null) => void;
  isLoadingTip: boolean;
  providers: Record<number, MovieProvider>;
  getProviders: (movieId: number) => Promise<void>;
  generateDailyTip: (forceReload?: boolean) => Promise<void>;
  unratedMovies: Movie[];
  getRating: (movieId: number) => import('../types').Rating | undefined;

}

export function useMovies({
  user,
  ratings,
  watchlist,
  selectedGenres,
  currentPage,
  incrementDicas,
  onNavigateToPricing,
}: UseMoviesParams): UseMoviesReturn {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [dailyTip, setDailyTip] = useState<Movie | null>(null);
  const [dailyTipReason, setDailyTipReason] = useState('');
  const [dailyTipGenre, setDailyTipGenre] = useState<number | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const [providers, setProviders] = useState<Record<number, MovieProvider>>({});

  const getRating = useCallback(
    (movieId: number) => ratings.find(r => r.movieId === movieId)?.rating,
    [ratings]
  );

  const unratedMovies = movies.filter(
    m => !getRating(m.id) && !watchlist.some(w => w.movieId === m.id)
  );
  const currentMovie = unratedMovies[0];

  // ── Feed query (replaces first useEffect) ──────────────────────────────
  const { data: feedData, isLoading: isFeedLoading } = useQuery({
    queryKey: ['movies', activeGenre],
    queryFn: async () => {
      const params: Record<string, string> = {
        language: 'pt-BR',
        page: '1',
      };
      const endpoint = activeGenre
        ? 'discover/movie'
        : 'movie/popular';
      if (activeGenre) {
        params.with_genres = String(activeGenre);
        params.sort_by = 'popularity.desc';
      }
      const data = await tmdbFetch<{ results: Movie[] }>(endpoint, params);
      return data.results ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Sync feed query data → local movies state only on genre change
  // (avoids resetting infinite-scroll pages on background refetch)
  const lastSyncedGenreRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (feedData !== undefined && lastSyncedGenreRef.current !== activeGenre) {
      lastSyncedGenreRef.current = activeGenre;
      setMovies(feedData);
      setFeedPage(1);
    }
  }, [feedData, activeGenre]);

  // ── Search debounce ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Search query (replaces search useEffect) ──────────────────────────
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ['search', debouncedSearchQuery],
    queryFn: async () => {
      const data = await tmdbFetch<{ results: Movie[] }>('search/movie', {
        language: 'pt-BR',
        query: debouncedSearchQuery,
      });
      return data.results ?? [];
    },
    enabled: !!user && currentPage === 'search' && debouncedSearchQuery.trim().length > 2,
    staleTime: 2 * 60 * 1000,
  });

  const isSearching = isSearchLoading;

  // ── Providers (kept as callback with local state cache) ────────────────
  const getProviders = useCallback(async (movieId: number) => {
    if (!user || providers[movieId]) return;
    try {
      const data = await tmdbFetch<TmdbProvidersResponse>(`movie/${movieId}/watch/providers`);
      setProviders(prev => ({ ...prev, [movieId]: data.results?.BR ?? {} }));
    } catch {
      // Silently handle provider fetch errors
    }
  }, [user, providers]);

  // ── Infinite scroll (kept as useEffect – complex side effects) ─────────
  useEffect(() => {
    if (!user) return;
    if (unratedMovies.length < 5 && !isLoadingMore && !isFeedLoading && movies.length > 0) {
      setIsLoadingMore(true);
      const nextPage = feedPage + 1;
      const params: Record<string, string> = {
        language: 'pt-BR',
        page: String(nextPage),
      };
      const endpoint = activeGenre
        ? 'discover/movie'
        : 'movie/popular';
      if (activeGenre) {
        params.with_genres = String(activeGenre);
        params.sort_by = 'popularity.desc';
      }
      tmdbFetch<{ results: Movie[] }>(endpoint, params)
        .then(data => {
          const newMovies = data.results ?? [];
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = newMovies.filter(m => !existingIds.has(m.id));
            return [...prev, ...uniqueNew];
          });
          setFeedPage(nextPage);
          setIsLoadingMore(false);
        })
        .catch(() => {
          setIsLoadingMore(false);
        });
    }
  }, [user, unratedMovies.length, feedPage, activeGenre, isLoadingMore, isFeedLoading, movies.length]);

  // ── Generate daily tip (kept as manual function – complex side effects) ─
  const generateDailyTip = useCallback(
    async (forceReload = false) => {
      if (forceReload) {
        const canGetTip = await incrementDicas();
        if (!canGetTip) {
          toast.error('Limite diário de dicas atingido! Assine o PRO para continuar.', { id: 'limit-dica' });
          onNavigateToPricing();
          return;
        }
      }

      setIsLoadingTip(true);
      let targetGenre = dailyTipGenre;
      let reason = '';

      const today = new Date().toISOString().split('T')[0];

      // Try loading saved tip
      if (user && !forceReload) {
        try {
          const savedTip = await supabaseService.getDailyTip(user.id);
          if (savedTip && savedTip.daily_tip_date === today && savedTip.daily_tip_id) {
            const movieData = await tmdbFetch<Movie>(`movie/${savedTip.daily_tip_id}`, { language: 'pt-BR' });
            setDailyTip(movieData);
            setDailyTipReason('Dica do dia salva para você');
            setIsLoadingTip(false);
            return;
          }
        } catch {
          // Continue to generate a new tip
        }
      }

      if (!targetGenre) {
        const genreCounts: Record<number, number> = {};
        selectedGenres.forEach(id => (genreCounts[id] = 5));

        ratings.forEach(r => {
          if (r.rating === 'loved' || r.rating === 'liked') {
            const movie = r.movie || movies.find(m => m.id === r.movieId);
            if (movie) {
              movie.genre_ids.forEach(id => {
                genreCounts[id] = (genreCounts[id] || 0) + (r.rating === 'loved' ? 2 : 1);
              });
            }
          }
        });

        let maxScore = 0;
        for (const [id, score] of Object.entries(genreCounts)) {
          if (score > maxScore) {
            maxScore = score;
            targetGenre = Number(id);
          }
        }

        if (!targetGenre) {
          targetGenre = GENRES[0].id;
        }

        const genreName = GENRES.find(g => g.id === targetGenre)?.name;
        reason = `Porque você gosta de ${genreName}`;
      } else {
        const genreName = GENRES.find(g => g.id === targetGenre)?.name;
        reason = `Dica de ${genreName} para você`;
      }

      const randomPage = Math.floor(Math.random() * 5) + 1;
      try {
        const params: Record<string, string> = {
          language: 'pt-BR',
          page: String(randomPage),
          with_genres: String(targetGenre),
          sort_by: 'popularity.desc',
        };
        const data = await tmdbFetch<{ results: Movie[] }>('discover/movie', params);
        const tipMovies = data.results ?? [];
        const unseen = tipMovies.filter(m => !getRating(m.id) && !watchlist.some(w => w.movieId === m.id));

        if (unseen.length > 0) {
          const randomMovie = unseen[Math.floor(Math.random() * unseen.length)];
          setDailyTip(randomMovie);
          setDailyTipReason(reason);
          if (user) {
            await supabaseService.saveDailyTip(user.id, randomMovie.id);
          }
        } else {
          setDailyTip(null);
        }
      } catch {
        setDailyTip(null);
      }
      setIsLoadingTip(false);
    },
    [user, dailyTipGenre, selectedGenres, ratings, movies, watchlist, getRating, incrementDicas, onNavigateToPricing]
  );

  // Auto-generate tip when navigating to daily_tip page
  const hasGeneratedTipRef = useRef(false);
  useEffect(() => {
    if (currentPage === 'daily_tip') {
      if (!hasGeneratedTipRef.current) {
        generateDailyTip().catch(() => {
          // Silently handle — DailyTipPage will show the empty state
        });
        hasGeneratedTipRef.current = true;
      }
    } else {
      hasGeneratedTipRef.current = false;
    }
  }, [currentPage]); // Intentionally omitting generateDailyTip and dailyTipGenre to prevent loops

  return {
    movies,
    setMovies,
    feedPage,
    activeGenre,
    setActiveGenre,
    isLoading: isFeedLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    currentMovie,
    dailyTip,
    dailyTipReason,
    dailyTipGenre,
    setDailyTipGenre,
    isLoadingTip,
    providers,
    getProviders,
    generateDailyTip,
    unratedMovies,
    getRating,
  };
}
