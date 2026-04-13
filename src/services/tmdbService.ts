/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import { invokeEdgeFunction } from '../lib/edgeFunction';

/**
 * All TMDB API calls go through the Supabase Edge Function proxy (tmdb-proxy)
 * so the API key is never exposed on the client side.
 *
 * Uses invokeEdgeFunction instead of supabase.functions.invoke() to avoid
 * the SDK's internal session race condition that causes 401 errors.
 */

async function tmdbFetch<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  return invokeEdgeFunction<T>('tmdb-proxy', { endpoint, params });
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
