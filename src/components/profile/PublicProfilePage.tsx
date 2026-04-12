/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Film, Crown } from 'lucide-react';
import { ProBadge, ProAvatarBorder } from '../common/ProBadge';
import { GENRES } from '../../constants';
import { supabase } from '../../lib/supabase';

interface PublicProfilePageProps {
  username: string;
}

interface PublicProfileData {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  favorite_count: number;
  rating_count: number;
  top_genre_id: number | null;
  is_public: boolean;
}

interface ProfileSubscriptionData {
  subscription_status: string | null;
  subscription_plan: string | null;
  selected_genres: number[] | null;
}

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ username }) => {
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<ProfileSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data: publicProfile, error: profileError } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('username', username)
          .eq('is_public', true)
          .single();

        if (profileError || !publicProfile) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfileData(publicProfile as PublicProfileData);

        const { data: profileInfo, error: subError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan, selected_genres')
          .eq('id', (publicProfile as PublicProfileData).id)
          .single();

        if (!subError && profileInfo) {
          setSubscriptionData(profileInfo as ProfileSubscriptionData);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const isPro =
    subscriptionData?.subscription_status === 'active' &&
    subscriptionData?.subscription_plan !== 'free' &&
    subscriptionData?.subscription_plan != null;

  const topGenre = profileData?.top_genre_id
    ? GENRES.find((g) => g.id === profileData.top_genre_id)
    : null;

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-gray-400 font-medium">Carregando perfil...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Not Found State ────────────────────────────────────────────
  if (notFound || !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-24 h-24 mx-auto rounded-full glass-card flex items-center justify-center mb-6 border border-white/10">
            <User className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold font-display mb-3">Perfil não encontrado</h1>
          <p className="text-gray-400 mb-8">
            Este perfil não existe ou não é público.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Film className="w-5 h-5" />
            Conheça o CineMatch
          </a>
        </motion.div>
      </div>
    );
  }

  // ─── Public Profile ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-2xl mx-auto w-full px-4 py-12 sm:py-20 relative z-10"
      >
        {/* ── Profile Card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-[2rem] border border-white/10 p-8 sm:p-12 text-center relative overflow-hidden"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

          <div className="relative z-10">
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              {isPro ? (
                <ProAvatarBorder className="mx-auto w-28 h-28 sm:w-32 sm:h-32">
                  <div className="w-full h-full rounded-full glass-card flex items-center justify-center bg-[#030303] border-2 border-transparent overflow-hidden">
                    {profileData.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt={profileData.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                </ProAvatarBorder>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full glass-card flex items-center justify-center border-2 border-purple-500/30 overflow-hidden">
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt={profileData.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              )}
            </motion.div>

            {/* Username & Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-1 flex items-center justify-center gap-2">
                @{profileData.username}
                {isPro && <ProBadge size="md" className="align-middle" />}
              </h1>
            </motion.div>

            {/* Bio */}
            {profileData.bio && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="text-gray-400 mt-3 max-w-sm mx-auto leading-relaxed"
              >
                {profileData.bio}
              </motion.p>
            )}

            {/* PRO Indicator Line */}
            {isPro && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center justify-center gap-2 mt-4"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400/80">
                  Membro PRO
                </span>
                <Crown className="w-4 h-4 text-amber-400" />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Stats Grid ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-3 gap-4 mt-6"
        >
          {/* Ratings */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <Star className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">
                {profileData.rating_count}
              </h3>
              <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] sm:text-xs mt-1">
                Avaliações
              </p>
            </div>
          </div>

          {/* Favorites */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <Film className="w-5 h-5 text-pink-400 mx-auto mb-2" />
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">
                {profileData.favorite_count}
              </h3>
              <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] sm:text-xs mt-1">
                Favoritos
              </p>
            </div>
          </div>

          {/* Top Genre */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <Crown className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-base sm:text-lg font-bold font-display text-white leading-tight mt-1">
                {topGenre?.name || 'Variado'}
              </h3>
              <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] sm:text-xs mt-1">
                Gênero Top
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Favorite Genres (if available) ─────────────────────── */}
        {subscriptionData?.selected_genres && subscriptionData.selected_genres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass-card rounded-2xl border border-white/10 p-6 mt-6"
          >
            <h3 className="text-lg font-bold font-display mb-4 text-white">
              Gêneros Favoritos
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.filter((g) =>
                subscriptionData.selected_genres!.includes(g.id)
              ).map((genre) => (
                <span
                  key={genre.id}
                  className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 text-gray-200"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CTA Button ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 text-center"
        >
          <a
            href="/"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:scale-[1.02] text-lg"
          >
            <Film className="w-5 h-5" />
            Criar meu perfil no CineMatch
          </a>
          <p className="text-gray-500 text-sm mt-4">
            Descubra filmes perfeitos para você
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PublicProfilePage;
