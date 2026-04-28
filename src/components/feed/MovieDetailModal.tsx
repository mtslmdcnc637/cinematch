/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Calendar, Film, Heart, ThumbsUp, ThumbsDown, EyeOff, Bookmark, PlayCircle } from 'lucide-react';
import { Movie, Rating } from '../../types';
import { fetchMovieById } from '../../services/tmdbService';

interface MovieDetailModalProps {
  show: boolean;
  movie: Movie | null;
  onClose: () => void;
  onRate: (movie: Movie, rating: Rating) => void;
  onAddToWatchlist: (movie: Movie) => void;
  isPro: boolean;
  getRating: (movieId: number) => Rating | undefined;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  show, movie, onClose, onRate, onAddToWatchlist, isPro, getRating
}) => {
  const [fullMovie, setFullMovie] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentRating = movie ? getRating(movie.id) : undefined;

  useEffect(() => {
    if (!show || !movie) return;
    setIsLoading(true);
    fetchMovieById(movie.id)
      .then(data => setFullMovie(data))
      .catch(() => setFullMovie(null))
      .finally(() => setIsLoading(false));
  }, [show, movie?.id]);

  if (!show || !movie) return null;

  const m = fullMovie || movie;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#111] border border-white/10 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Hero image */}
          <div className="relative h-72 md:h-80 overflow-hidden rounded-t-[2rem]">
            {m.backdrop_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`}
                alt={m.title}
                className="w-full h-full object-cover"
              />
            ) : m.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w780${m.poster_path}`}
                alt={m.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Film className="w-16 h-16 text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="px-6 md:px-8 pb-8 -mt-16 relative z-10">
            <h2 className="text-3xl font-bold text-white font-display mb-2">{m.title}</h2>
            
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                {(m.vote_average ?? 0).toFixed(1)}
              </span>
              {m.release_date && (
                <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {m.release_date?.split('-')[0]}
                </span>
              )}
              {m.runtime && (
                <span className="text-sm text-gray-400">{Math.floor(m.runtime / 60)}h {m.runtime % 60}min</span>
              )}
            </div>

            {/* Genres */}
            {m.genres && m.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {m.genres.map((g: any) => (
                  <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {m.overview && (
              <p className="text-gray-300 leading-relaxed mb-6 text-sm">{m.overview}</p>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Cast */}
            {m.credits?.cast && m.credits.cast.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-bold text-sm mb-2">Elenco</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {m.credits.cast.slice(0, 8).map((person: any) => (
                    <div key={person.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                      <div className="w-12 h-12 rounded-full bg-white/5 overflow-hidden border border-white/10">
                        {person.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{person.name?.[0]}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">{person.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trailer */}
            {m.videos?.results?.length > 0 && (
              <div className="mb-6">
                <a
                  href={`https://www.youtube.com/watch?v=${m.videos.results[0].key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-600/30 transition-colors text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  Assistir Trailer
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => { onRate(movie, 'loved'); onClose(); }}
                className={`p-3 rounded-full border transition-all ${currentRating === 'loved' ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-pink-400 hover:border-pink-500/30'}`}
                title="Amei"
              >
                <Heart className={`w-6 h-6 ${currentRating === 'loved' ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => { onRate(movie, 'liked'); onClose(); }}
                className={`p-3 rounded-full border transition-all ${currentRating === 'liked' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:border-blue-500/30'}`}
                title="Gostei"
              >
                <ThumbsUp className={`w-6 h-6 ${currentRating === 'liked' ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => { onAddToWatchlist(movie); onClose(); }}
                className="p-3 rounded-full border bg-white/5 border-white/10 text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                title="Ver Depois"
              >
                <Bookmark className="w-6 h-6" />
              </button>
              <button
                onClick={() => { onRate(movie, 'disliked'); onClose(); }}
                className={`p-3 rounded-full border transition-all ${currentRating === 'disliked' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30'}`}
                title="Não Gostei"
              >
                <ThumbsDown className={`w-6 h-6 ${currentRating === 'disliked' ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => { onRate(movie, 'skipped'); onClose(); }}
                className="p-3 rounded-full border bg-white/5 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/30 transition-all"
                title="Não Ver"
              >
                <EyeOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
