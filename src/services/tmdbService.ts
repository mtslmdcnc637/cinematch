/// <reference types="vite/client" />
import { TMDB_API_BASE } from '../constants';

// NOTE: In a real production app, this API key should be handled on the server.
// For this prototype, we'll assume the user has a TMDb API key.
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export const fetchPopularMovies = async (page = 1) => {
  const response = await fetch(`${TMDB_API_BASE}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${page}`);
  const data = await response.json();
  return data.results || [];
};

export const fetchDiscoverMovies = async (page = 1, genreId?: number) => {
  const url = genreId
    ? `${TMDB_API_BASE}/discover/movie?api_key=${API_KEY}&language=pt-BR&page=${page}&with_genres=${genreId}&sort_by=popularity.desc`
    : `${TMDB_API_BASE}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${page}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results || [];
};

export const searchMovies = async (query: string) => {
  const response = await fetch(`${TMDB_API_BASE}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${query}`);
  const data = await response.json();
  return data.results || [];
};

export const fetchMovieById = async (movieId: number) => {
  const response = await fetch(`${TMDB_API_BASE}/movie/${movieId}?api_key=${API_KEY}&language=pt-BR`);
  const data = await response.json();
  return data;
};

export const fetchMovieTrailers = async (movieId: number) => {
  const response = await fetch(`${TMDB_API_BASE}/movie/${movieId}/videos?api_key=${API_KEY}&language=pt-BR`);
  const data = await response.json();
  const trailers = data.results.filter((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  
  // Prioriza trailers em português
  const ptTrailers = trailers.filter((v: any) => v.iso_639_1 === 'pt');
  return ptTrailers.length > 0 ? ptTrailers : trailers;
};
