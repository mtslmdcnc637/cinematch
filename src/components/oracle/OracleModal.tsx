/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Sparkles, Star, Calendar, Users } from 'lucide-react';
import type { OracleResult } from '../../types';
import type { Movie } from '../../types';
import type { OracleMode } from '../../hooks/useRatings';

interface OracleModalProps {
  show: boolean;
  onClose: () => void;
  result: OracleResult | null;
  movies: Movie[];
  isLoading: boolean;
  mode?: OracleMode;
}

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w342';

// Match TMDB movie data to Oracle recommendations by title
function matchMovie(rec: { title: string }, movies: Movie[]): Movie | undefined {
  if (!movies.length) return undefined;
  const normalizedTitle = rec.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return movies.find(m => {
    const mTitle = m.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return mTitle.includes(normalizedTitle) || normalizedTitle.includes(mTitle);
  });
}

export const OracleModal: React.FC<OracleModalProps> = ({
  show,
  onClose,
  result,
  movies,
  isLoading,
  mode = 'personal',
}) => {
  const isGroup = mode === 'group';

  // Determine display mode
  const hasStructuredResult = result && result.movies && result.movies.length > 0;
  const hasFallbackText = result?.fallback_text;
  const displayText = hasFallbackText || (result?.summary || '');

  // Theme colors based on mode
  const accentColor = isGroup ? 'purple' : 'emerald';
  const accentFrom = isGroup ? 'from-purple-500' : 'from-emerald-500';
  const accentTo = isGroup ? 'to-pink-500' : 'to-teal-500';
  const accentBorder = isGroup ? 'border-purple-500/30' : 'border-emerald-500/30';
  const accentGlow = isGroup ? 'shadow-[0_0_30px_rgba(168,85,247,0.5)]' : 'shadow-[0_0_30px_rgba(16,185,129,0.5)]';
  const accentGradient = isGroup ? 'from-purple-500/10 to-pink-500/10' : 'from-emerald-500/10 to-teal-500/10';
  const accentText = isGroup ? 'text-purple-400' : 'text-emerald-400';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#111] border rounded-[2rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col"
            style={{ borderColor: isGroup ? 'rgba(168,85,247,0.3)' : 'rgba(16,185,129,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${accentGradient} pointer-events-none`} />

            <button
              onClick={() => onClose()}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 z-20"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>

            <div className="text-center relative z-10 flex-shrink-0">
              <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${accentFrom} ${accentTo} rounded-full flex items-center justify-center mb-4 ${accentGlow}`}>
                {isGroup ? (
                  <Users className="w-8 h-8 text-white" />
                ) : (
                  <Bot className="w-8 h-8 text-white" />
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-1 font-display">
                {isGroup ? 'Acordo de Paz' : 'Oráculo de IA'}
              </h3>
              <p className="text-gray-500 text-xs">
                {isGroup ? 'Recomendações para todo o grupo' : 'Recomendações personalizadas para você'}
              </p>
            </div>

            <div className="relative z-10 overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Sparkles className={`w-10 h-10 ${accentText} animate-spin-slow mb-4`} />
                  <p className="text-gray-400">
                    {isGroup
                      ? 'Analisando os gostos do grupo...'
                      : 'O Oráculo está analisando seu perfil...'}
                  </p>
                </div>
              ) : hasStructuredResult ? (
                <>
                  {/* Summary */}
                  {displayText && (
                    <div className="text-gray-400 text-sm text-center bg-black/30 p-4 rounded-xl border border-white/5">
                      {displayText}
                    </div>
                  )}

                  {/* Movie Cards */}
                  <div className="space-y-3">
                    {result.movies.map((rec, idx) => {
                      const tmdbMovie = matchMovie(rec, movies);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex gap-4 bg-black/40 rounded-2xl border border-white/5 overflow-hidden"
                        >
                          {/* Poster */}
                          {tmdbMovie?.poster_path ? (
                            <div className="w-24 sm:w-28 flex-shrink-0">
                              <img
                                src={`${TMDB_IMG_BASE}${tmdbMovie.poster_path}`}
                                alt={rec.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className={`w-24 sm:w-28 flex-shrink-0 bg-gradient-to-br ${accentGradient} flex items-center justify-center`}>
                              <Film className="w-8 h-8 opacity-40" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="py-3 pr-3 flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm sm:text-base leading-tight">
                              {tmdbMovie?.title || rec.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {rec.year > 0 && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {rec.year}
                                </span>
                              )}
                              {tmdbMovie?.vote_average && tmdbMovie.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <Star className="w-3 h-3 fill-current" />
                                  {(tmdbMovie.vote_average ?? 0).toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs mt-2 leading-relaxed line-clamp-3">
                              {rec.reason}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : hasFallbackText ? (
                /* Fallback: plain text from AI */
                <div className="text-gray-300 text-sm text-left bg-black/40 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                  {result.fallback_text}
                </div>
              ) : null}
            </div>

            <div className="mt-4 relative z-10 flex-shrink-0">
              <button
                onClick={() => onClose()}
                className="w-full py-4 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Simple Film icon for fallback poster
function Film({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}
