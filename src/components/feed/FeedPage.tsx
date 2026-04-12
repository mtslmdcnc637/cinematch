/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { Movie, Rating } from '../../types';
import { GENRES } from '../../constants';
import { MovieCard } from './MovieCard';

interface FeedPageProps {
  currentMovie: Movie | undefined;
  activeGenre: number | null;
  setActiveGenre: (genre: number | null) => void;
  saveRating: (movie: Movie, rating: Rating) => void;
  addToWatchlist: (movie: Movie) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isPro: boolean;
  providers: Record<number, any>;
  getProviders: (movieId: number) => void;
  ratingAnimation: { type: Rating; id: number } | null;
  onShare?: (movie: Movie) => void;
}

const GenreFilter = ({ active, onChange }: { active: number | null; onChange: (id: number | null) => void }) => (
  <div className="flex overflow-x-auto no-scrollbar gap-2 py-4 px-4 -mx-4 mb-4 w-full max-w-md">
    <button
      onClick={() => onChange(null)}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border ${active === null ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
    >
      Todos
    </button>
    {GENRES.map(g => (
      <button
        key={g.id}
        onClick={() => onChange(g.id)}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border ${active === g.id ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
      >
        {g.name}
      </button>
    ))}
  </div>
);

export const FeedPage: React.FC<FeedPageProps> = ({
  currentMovie,
  activeGenre,
  setActiveGenre,
  saveRating,
  addToWatchlist,
  isLoading,
  isLoadingMore,
  isPro,
  providers,
  getProviders,
  ratingAnimation,
  onShare,
}) => {
  return (
    <motion.div
      key="feed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-start max-w-md mx-auto w-full pt-2"
    >
      <GenreFilter active={activeGenre} onChange={setActiveGenre} />

      {isLoading ? (
        <div className="w-full aspect-[2/3] rounded-[2rem] glass-card animate-pulse flex items-center justify-center mt-4">
          <Sparkles className="w-12 h-12 text-white/20 animate-spin-slow" />
        </div>
      ) : currentMovie ? (
        <MovieCard
          movie={currentMovie}
          onRate={saveRating}
          onAddToWatchlist={addToWatchlist}
          isPro={isPro}
          providers={providers}
          getProviders={getProviders}
          ratingAnimation={ratingAnimation}
          onShare={onShare}
        />
      ) : (
        <div className="text-center py-20 glass-card rounded-[2rem] w-full px-8 mt-4">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
            <Check className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-3xl font-bold mb-4 font-display">Você zerou o feed!</h3>
          <p className="text-gray-400 mb-8 text-lg">Volte mais tarde ou mude o gênero para novas recomendações.</p>
          <button
            onClick={() => setActiveGenre(null)}
            className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
          >
            Ver Todos os Gêneros
          </button>
        </div>
      )}
    </motion.div>
  );
};
