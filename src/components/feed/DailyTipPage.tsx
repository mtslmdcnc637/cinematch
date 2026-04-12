/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Heart, ThumbsUp, ThumbsDown, EyeOff, Film, Star, Calendar, Lightbulb, PlayCircle, Bookmark, Share2, RefreshCw } from 'lucide-react';
import { Movie, Rating } from '../../types';
import { GENRES } from '../../constants';
import { WhereToWatch } from './WhereToWatch';

interface DailyTipPageProps {
  dailyTip: Movie | null;
  dailyTipReason: string;
  dailyTipGenre: number | null;
  setDailyTipGenre: (genre: number | null) => void;
  isLoadingTip: boolean;
  generateDailyTip: (forceReload?: boolean) => void;
  isPro: boolean;
  saveRating: (movie: Movie, rating: Rating) => void;
  addToWatchlist: (movie: Movie) => void;
  providers: Record<number, any>;
  getProviders: (movieId: number) => void;
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

export const DailyTipPage: React.FC<DailyTipPageProps> = ({
  dailyTip,
  dailyTipReason,
  dailyTipGenre,
  setDailyTipGenre,
  isLoadingTip,
  generateDailyTip,
  isPro,
  saveRating,
  addToWatchlist,
  providers,
  getProviders,
  onShare,
}) => {
  return (
    <motion.div
      key="daily_tip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-start max-w-md mx-auto w-full pt-2"
    >
      <div className="flex items-center justify-between w-full mb-2 px-4">
        <div className="text-left">
          <h2 className="text-3xl font-bold font-display mb-1">Dica do Dia</h2>
          <p className="text-gray-400 text-sm">Uma recomendação especial para você</p>
        </div>
        <button
          onClick={() => generateDailyTip(true)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
          title="Recarregar dica"
        >
          <RefreshCw className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      <GenreFilter active={dailyTipGenre} onChange={setDailyTipGenre} />

      {isLoadingTip ? (
        <div className="w-full aspect-[2/3] rounded-[2rem] glass-card animate-pulse flex items-center justify-center mt-4">
          <Film className="w-12 h-12 text-white/20 animate-spin-slow" />
        </div>
      ) : dailyTip ? (
        <div className="w-full relative group mt-4">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] whitespace-nowrap">
            {dailyTipReason}
          </div>

          {/* Cinematic Card */}
          <div className="relative w-full h-[60vh] max-h-[550px] min-h-[400px] rounded-[2rem] overflow-hidden shadow-2xl border border-purple-500/30 bg-[#111]">
            {dailyTip.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w780${dailyTip.poster_path}`}
                alt={dailyTip.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Film className="w-16 h-16" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

            {/* Where to watch */}
            <div className="absolute top-4 left-4 z-10" onMouseEnter={() => getProviders(dailyTip.id)}>
              <div className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg cursor-pointer hover:bg-white/20 transition-colors">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
              <WhereToWatch movieId={dailyTip.id} providers={providers} />
            </div>

            {/* Share Button */}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(dailyTip);
                }}
                className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors z-10"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {dailyTip.vote_average.toFixed(1)}
                </span>
                <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {dailyTip.release_date?.split('-')[0]}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display leading-tight tracking-tight break-words">
                {dailyTip.title}
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4">{dailyTip.overview}</p>
            </div>
          </div>

          {/* Action Bar for Tip */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <RatingButton
              onClick={() => {
                saveRating(dailyTip, 'not_seen');
                generateDailyTip();
              }}
              icon={<EyeOff className="w-5 h-5" />}
              colorClass="text-gray-400 hover:text-white hover:bg-white/10"
              tooltip="Pular"
            />
            <RatingButton
              onClick={() => {
                saveRating(dailyTip, 'disliked');
                generateDailyTip();
              }}
              icon={<ThumbsDown className="w-5 h-5" />}
              colorClass="text-red-500 hover:bg-red-500/20"
              tooltip="Não Gostei"
            />
            <RatingButton
              onClick={() => {
                addToWatchlist(dailyTip);
                generateDailyTip();
              }}
              icon={<Bookmark className="w-5 h-5" />}
              colorClass="text-blue-400 hover:bg-blue-500/20"
              tooltip="Ver Depois"
            />
            <RatingButton
              onClick={() => {
                saveRating(dailyTip, 'liked');
                generateDailyTip();
              }}
              icon={<ThumbsUp className="w-5 h-5" />}
              colorClass="text-emerald-500 hover:bg-emerald-500/20"
              tooltip="Gostei"
            />
            <RatingButton
              onClick={() => {
                saveRating(dailyTip, 'loved');
                generateDailyTip();
              }}
              icon={<Heart className="w-5 h-5" />}
              colorClass="text-pink-500 hover:bg-pink-500/20"
              tooltip="Amei"
              large
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-[2rem] w-full px-8 mt-4">
          <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Não encontramos uma dica no momento. Tente outro gênero ou avalie mais filmes!</p>
        </div>
      )}
    </motion.div>
  );
};
