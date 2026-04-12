/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Heart, ThumbsUp, ThumbsDown, EyeOff, Bookmark, Trash2, Library, Star } from 'lucide-react';
import { Movie, Rating, UserRating, WatchlistItem } from '../../types';

interface LibraryPageProps {
  ratings: UserRating[];
  watchlist: WatchlistItem[];
  libraryTab: 'rated' | 'watchlist' | 'skipped';
  setLibraryTab: (tab: 'rated' | 'watchlist' | 'skipped') => void;
  removeFromWatchlist: (movieId: number, e?: React.MouseEvent) => void;
  saveRating: (movie: Movie, rating: Rating) => void;
  getRatingIcon: (rating: Rating, className?: string) => React.ReactNode;
  movies?: Movie[];
  onMovieClick?: (movie: Movie) => void;
  onNavigateToFeed?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  ratings,
  watchlist,
  libraryTab,
  setLibraryTab,
  removeFromWatchlist,
  saveRating,
  getRatingIcon,
  movies = [],
  onMovieClick,
  onNavigateToFeed,
}) => {
  return (
    <motion.div
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-display mb-3">Sua Biblioteca</h2>
          <p className="text-lg text-gray-400">Gerencie seus filmes avaliados e sua lista de interesses.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
            <span>{ratings.filter(r => r.rating === 'loved').length}</span>
          </div>
          <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-500 fill-emerald-500" />
            <span>{ratings.filter(r => r.rating === 'liked').length}</span>
          </div>
          <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-400 fill-blue-400" />
            <span>{watchlist.length}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 mb-8 border-b border-white/10 pb-4 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setLibraryTab('rated')}
          className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'rated' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Avaliados
          {libraryTab === 'rated' && (
            <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setLibraryTab('watchlist')}
          className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'watchlist' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Ver Depois
          {libraryTab === 'watchlist' && (
            <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setLibraryTab('skipped')}
          className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'skipped' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Pulados
          {libraryTab === 'skipped' && (
            <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {libraryTab === 'rated' && (
        ratings.filter(r => r.rating === 'loved' || r.rating === 'liked').length === 0 ? (
          <div className="text-center py-32 glass-card rounded-[2rem]">
            <Library className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-3 font-display">Sua biblioteca está vazia</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Comece a avaliar filmes no feed para construir sua coleção pessoal.</p>
            {onNavigateToFeed && (
              <button
                onClick={onNavigateToFeed}
                className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
              >
                Descobrir Filmes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {ratings.filter(r => r.rating === 'loved' || r.rating === 'liked').map(rating => {
              const movie = rating.movie || movies.find(m => m.id === rating.movieId);
              if (!movie) return null;
              return (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                  onClick={() => onMovieClick?.(movie)}
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
                      {getRatingIcon(rating.rating, 'w-4 h-4')}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{movie.vote_average.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {libraryTab === 'watchlist' && (
        watchlist.length === 0 ? (
          <div className="text-center py-32 glass-card rounded-[2rem]">
            <Bookmark className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-3 font-display">Sua lista está vazia</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Adicione filmes que você quer ver depois enquanto navega pelo feed.</p>
            {onNavigateToFeed && (
              <button
                onClick={onNavigateToFeed}
                className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
              >
                Descobrir Filmes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {watchlist.map(item => {
              const movie = item.movie || movies.find(m => m.id === item.movieId);
              if (!movie) return null;
              return (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                  onClick={() => onMovieClick?.(movie)}
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    <button
                      onClick={(e) => removeFromWatchlist(movie.id, e)}
                      className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{movie.vote_average.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {libraryTab === 'skipped' && (
        ratings.filter(r => r.rating === 'disliked' || r.rating === 'not_seen').length === 0 ? (
          <div className="text-center py-32 glass-card rounded-[2rem]">
            <EyeOff className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-3 font-display">Nenhum filme pulado</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Os filmes que você pular ou não gostar aparecerão aqui.</p>
            {onNavigateToFeed && (
              <button
                onClick={onNavigateToFeed}
                className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
              >
                Descobrir Filmes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {ratings.filter(r => r.rating === 'disliked' || r.rating === 'not_seen').map(rating => {
              const movie = rating.movie || movies.find(m => m.id === rating.movieId);
              if (!movie) return null;
              return (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                  onClick={() => onMovieClick?.(movie)}
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover opacity-50 grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
                      {getRatingIcon(rating.rating, 'w-4 h-4')}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{movie.vote_average.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </motion.div>
  );
};
