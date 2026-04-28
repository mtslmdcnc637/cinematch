/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, EyeOff, Film, Star, Calendar, PlayCircle, Bookmark, Share2 } from 'lucide-react';
import { Movie, Rating } from '../../types';
import { WhereToWatch } from './WhereToWatch';
import { MovieDetailModal } from './MovieDetailModal';

interface MovieCardProps {
  movie: Movie;
  onRate: (movie: Movie, rating: Rating) => void;
  onAddToWatchlist: (movie: Movie) => void;
  isPro: boolean;
  providers: Record<number, any>;
  getProviders: (movieId: number) => void;
  ratingAnimation: { type: Rating; id: number } | null;
  onShare?: (movie: Movie) => void;
}

// Helper component for rating buttons
function RatingButton({ onClick, icon, colorClass, tooltip, large = false }: any) {
  return (
    <div className="relative group/btn">
      <motion.button
        whileHover={{ scale: 1.15, y: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={`flex items-center justify-center rounded-full transition-all duration-300 bg-white/5 border border-white/10 shadow-lg ${colorClass} ${
          large ? 'w-16 h-16' : 'w-14 h-14'
        }`}
      >
        {icon}
      </motion.button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-black/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
        {tooltip}
      </div>
    </div>
  );
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onRate,
  onAddToWatchlist,
  isPro,
  providers,
  getProviders,
  ratingAnimation,
  onShare,
}) => {
  const [showDetail, setShowDetail] = React.useState(false);
  return (
    <>
    <AnimatePresence mode="popLayout">
      <motion.div
        key={movie.id}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20, filter: 'blur(10px)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full relative group mt-4"
      >
        {/* Cinematic Card */}
        <div className="relative w-full h-[60vh] max-h-[550px] min-h-[400px] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-[#111]">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 cursor-pointer"
              onClick={() => setShowDetail(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Film className="w-16 h-16" />
            </div>
          )}

          {/* Gradients for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

          {/* Where to watch */}
          <div className="absolute top-4 left-4 z-10" onMouseEnter={() => getProviders(movie.id)}>
            <div className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg cursor-pointer hover:bg-white/20 transition-colors">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <WhereToWatch movieId={movie.id} providers={providers} />
          </div>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(movie);
              }}
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors z-10"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}

          {/* Movie Info */}
          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                {(movie.vote_average ?? 0).toFixed(1)}
              </span>
              <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-gray-300">
                <Calendar className="w-4 h-4" />
                {movie.release_date?.split('-')[0]}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display leading-tight tracking-tight break-words cursor-pointer hover:text-purple-300 transition-colors" onClick={() => setShowDetail(true)}>
              {movie.title}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-12 line-clamp-4">{movie.overview}</p>
          </div>
        </div>

        {/* Floating Action Bar */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <RatingButton
            onClick={() => onRate(movie, 'not_seen')}
            icon={<EyeOff className="w-5 h-5" />}
            colorClass="text-gray-400 hover:text-white hover:bg-white/10"
            tooltip="Pular"
          />
          <RatingButton
            onClick={() => onRate(movie, 'disliked')}
            icon={<ThumbsDown className="w-5 h-5" />}
            colorClass="text-red-500 hover:bg-red-500/20"
            tooltip="Não Gostei"
          />
          <RatingButton
            onClick={() => onAddToWatchlist(movie)}
            icon={<Bookmark className="w-5 h-5" />}
            colorClass="text-blue-400 hover:bg-blue-500/20"
            tooltip="Ver Depois"
          />
          <RatingButton
            onClick={() => onRate(movie, 'liked')}
            icon={<ThumbsUp className="w-5 h-5" />}
            colorClass="text-emerald-500 hover:bg-emerald-500/20"
            tooltip="Gostei"
          />
          <RatingButton
            onClick={() => onRate(movie, 'loved')}
            icon={<Heart className="w-5 h-5" />}
            colorClass="text-pink-500 hover:bg-pink-500/20"
            tooltip="Amei"
            large
          />
        </div>
      </motion.div>
      
    </AnimatePresence>
    <MovieDetailModal
        show={showDetail}
        movie={movie}
        onClose={() => setShowDetail(false)}
        onRate={onRate}
        onAddToWatchlist={onAddToWatchlist}
        isPro={isPro}
        getRating={() => undefined}
      />
    </>
  );
};
