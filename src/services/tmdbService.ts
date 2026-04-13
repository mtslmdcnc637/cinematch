/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import { supabase } from '../lib/supabase';
import { TMDB_API_BASE } from '../constants';

/**
 * All TMDB API calls go through the Supabase Edge Function proxy (tmdb-proxy)
 * so the API key is never exposed on the client side.
 *
 * supabase.functions.invoke() automatically sends the Authorization header.
 * We also verify a session exists before calling to avoid unnecessary 401 errors.
 * If we get a 401, we try refreshing the session once before giving up.
 */

async function tmdbFetch<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!supabase) throw new Error('Supabase not initialized');

  // Verify we have an active session before calling the edge function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session — user must be logged in');
  }

  const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
    body: { endpoint, params },
  });

  if (error) {
    // If 401, the access_token may have expired — try refreshing once
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session) {
        // Retry with the refreshed session
        const retry = await supabase.functions.invoke('tmdb-proxy', {
          body: { endpoint, params },
        });
        if (retry.error) {
          await supabase.auth.signOut();
          throw retry.error;
        }
        return retry.data as T;
      }
      // Refresh failed — sign out
      await supabase.auth.signOut();
    }
    throw error;
  }
  return data as T;
}

export const fetchPopularMovies = async (page = 1) => {
  const data = await tmdbFetch<{ results: any[] }>('movie/popular', { language: 'pt-BR', page: String(page) });
  return data.results || [];
};

export const fetchDiscoverMovies = async (page = 1, genreId?: number) => {
  const params: Record<string, string> = { language: 'pt-BR', page: String(page) };
  if (genreId) {
    params.with_genres = String(genreId);
    params.sort_by = 'popularity.desc';
    const data = await tmdbFetch<{ results: any[] }>('discover/movie', params);
    return data.results || [];
  }
  const data = await tmdbFetch<{ results: any[] }>('movie/popular', params);
  return data.results || [];
};

export const searchMovies = async (query: string) => {
  const data = await tmdbFetch<{ results: any[] }>('search/movie', { language: 'pt-BR', query });
  return data.results || [];
};

export const fetchMovieById = async (movieId: number) => {
  return tmdbFetch(`movie/${movieId}`, { language: 'pt-BR' });
};

export const fetchMovieTrailers = async (movieId: number) => {
  const data = await tmdbFetch<{ results: Array<{ type: string; site: string; iso_639_1: string; key: string }> }>(`movie/${movieId}/videos`, { language: 'pt-BR' });
  const trailers = (data.results || []).filter(v => v.type === 'Trailer' && v.site === 'YouTube');

  // Prioritize Portuguese trailers
  const ptTrailers = trailers.filter(v => v.iso_639_1 === 'pt');
  return ptTrailers.length > 0 ? ptTrailers : trailers;
};

export const fetchMovieProviders = async (movieId: number) => {
  const data = await tmdbFetch<{ results?: { BR?: any } }>(`movie/${movieId}/watch/providers`);
  return data.results?.BR || {};
};
