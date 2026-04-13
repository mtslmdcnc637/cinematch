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
 * This function ensures a valid session exists before calling the edge function.
 * It checks token expiry and refreshes proactively, and also sends the
 * Authorization header explicitly (belt-and-suspenders with SDK auto-header).
 */

async function tmdbFetch<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!supabase) throw new Error('Supabase not initialized');

  // Get current session and ensure token is valid
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session — user must be logged in');
  }

  // Check if access_token is expired and refresh proactively
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session) {
        session = refreshData.session;
      } else {
        await supabase.auth.signOut();
        throw new Error('Session expired and could not be refreshed');
      }
    }
  } catch (e) {
    // If token parsing fails, try refreshing
    if (e instanceof Error && e.message.includes('Session expired')) throw e;
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData.session) {
      session = refreshData.session;
    }
  }

  // Call the edge function with explicit Authorization header
  const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
    body: { endpoint, params },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    // If 401, the access_token may still be invalid — try refreshing once more
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session) {
        // Retry with the freshly refreshed session
        const retry = await supabase.functions.invoke('tmdb-proxy', {
          body: { endpoint, params },
          headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
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
