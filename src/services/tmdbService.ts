/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import { TMDB_API_BASE } from '../constants';

/**
 * TMDB API calls are made directly using the VITE_TMDB_API_KEY env variable.
 * This avoids the 401 errors from the tmdb-proxy Supabase edge function
 * and works for both authenticated and non-authenticated users.
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

async function tmdbFetch<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error('VITE_TMDB_API_KEY is not configured');
  }

  const queryParams: Record<string, string> = {
    api_key: TMDB_API_KEY,
    ...params,
  };

  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${TMDB_API_BASE}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.status_message || `TMDB API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
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
