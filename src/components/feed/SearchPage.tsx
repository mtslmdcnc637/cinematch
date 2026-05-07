/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Film, Star, Heart, ThumbsUp, ThumbsDown, EyeOff, PlayCircle } from 'lucide-react';
import { Movie, Rating, UserRating } from '../../types';
import { WhereToWatch } from './WhereToWatch';
import { MovieDetailModal } from './MovieDetailModal';

interface SearchPageProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Movie[];
  isSearching: boolean;
  saveRating: (movie: Movie, rating: Rating) => void;
  addToWatchlist: (movie: Movie) => void;
  getRating: (movieId: number) => Rating | undefined;
  providers: Record<number, any>;
  getProviders: (movieId: number) => void;
  getRatingIcon: (rating: Rating, className?: string) => React.ReactNode;
  onMovieClick?: (movie: Movie) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  saveRating,
  addToWatchlist,
  getRating,
  providers,
  getProviders,
  getRatingIcon,
  onMovieClick,
}) => {
  const [detailMovie, setDetailMovie] = React.useState<Movie | null>(null);
  return (
    <>
    <motion.div
      key="search"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar filmes por título..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-lg"
        />
      </div>

      {isSearching ? (
        <div className="flex justify-center py-20">
          <Film className="w-12 h-12 text-white/20 animate-spin-slow" />
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {searchResults.map(movie => (
            <motion.div
              key={movie.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
              onClick={() => { onMovieClick?.(movie); setDetailMovie(movie); }}
            >
              <div className="aspect-[2/3] relative">
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#111] text-gray-600">
                    <Film className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {getRating(movie.id) && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
                    {getRatingIcon(getRating(movie.id)!, 'w-4 h-4')}
                  </div>
                )}

                <div
                  className="absolute top-3 left-3"
                  onMouseEnter={() => getProviders(movie.id)}
                  onClick={(e) => { e.stopPropagation(); getProviders(movie.id); }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-white" />
                  </motion.div>
                  <WhereToWatch movieId={movie.id} providers={providers} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>{(movie.vote_average ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : searchQuery.trim().length > 2 ? (
        <div className="text-center py-20 glass-card rounded-[2rem]">
          <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2 font-display">Nenhum filme encontrado</h3>
          <p className="text-gray-400">Tente buscar por outro título.</p>
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-[2rem]">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2 font-display">Busque seus filmes favoritos</h3>
          <p className="text-gray-400">Digite pelo menos 3 letras para começar a busca.</p>
        </div>
      )}
    </motion.div>
      <MovieDetailModal
        show={!!detailMovie}
        movie={detailMovie}
        onClose={() => setDetailMovie(null)}
        onRate={saveRating}
        onAddToWatchlist={addToWatchlist}
        isPro={false}
        getRating={getRating}
      />
    </>
  );
};
