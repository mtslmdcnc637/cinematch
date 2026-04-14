/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Bot, Sparkles, Lock, Camera, Globe, Link, Loader2 } from 'lucide-react';
import { UserProfile, UserRating, WatchlistItem } from '../../types';
import { GENRES, LEVELS } from '../../constants';
import { ProBadge, ProAvatarBorder } from '../common/ProBadge';
import { toast } from 'sonner';
import { supabaseService } from '../../services/supabaseService';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface ProfilePageProps {
  userProfile: UserProfile;
  ratings: UserRating[];
  watchlist: WatchlistItem[];
  isPro: boolean;
  planType: string;
  onSignOut: () => void;
  handleExportForAI: () => void;
  oracleResult: string | null;
  isOracleLoading: boolean;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  subscriptionStatus?: any;
  user?: any;
  authEmail?: string;
  setAuthEmail?: (email: string) => void;
  authPassword?: string;
  setAuthPassword?: (password: string) => void;
  authUsername?: string;
  setAuthUsername?: (username: string) => void;
  isSignUp?: boolean;
  setIsSignUp?: (isSignUp: boolean) => void;
  isAuthLoading?: boolean;
  handleEmailAuth?: (e: React.FormEvent | undefined) => void;
  handleGoogleAuth?: () => void;
  selectedGenres?: number[];
  onEditGenres?: () => void;
  notificationPrefs?: Record<string, boolean>;
  onUpdatePreference: (key: string, value: boolean) => void;
  avatarUrl?: string | null;
  isPublicProfile?: boolean;
  onProfileUpdate?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  // Add navigate for sign-up redirect
  userProfile,
  ratings,
  watchlist,
  isPro,
  planType,
  onSignOut,
  handleExportForAI,
  oracleResult,
  isOracleLoading,
  showExportModal,
  setShowExportModal,
  user,
  authEmail = '',
  setAuthEmail = () => {},
  authPassword = '',
  setAuthPassword = () => {},
  authUsername = '',
  setAuthUsername = () => {},
  isSignUp = false,
  setIsSignUp = () => {},
  isAuthLoading = false,
  handleEmailAuth,
  handleGoogleAuth,
  selectedGenres = [],
  onEditGenres = () => {},
  notificationPrefs = {},
  onUpdatePreference,
  avatarUrl,
  isPublicProfile = false,
  onProfileUpdate = () => {},
}) => {
  const navigate = useNavigate();
  const currentLevelData = LEVELS.find(l => l.level === userProfile.level);
  const nextLevelData = LEVELS.find(l => l.level === userProfile.level + 1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(avatarUrl || null);
  const [isPublic, setIsPublic] = useState(isPublicProfile);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  const pushNotifications = usePushNotifications();

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto w-full"
    >
      <div className="text-center mb-12">
        {/* Avatar with upload overlay */}
        <div className="relative inline-block mb-6">
          {isPro ? (
            <ProAvatarBorder className="mx-auto w-32 h-32">
              <div className="w-full h-full rounded-full glass-card flex items-center justify-center bg-[#030303] border-2 border-transparent overflow-hidden">
                {localAvatarUrl ? (
                  <img src={localAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </ProAvatarBorder>
          ) : (
            <div className="w-32 h-32 mx-auto rounded-full glass-card flex items-center justify-center border-2 border-purple-500/30 relative overflow-hidden">
              {localAvatarUrl ? (
                <img src={localAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
              {isPro && (
                <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  PRO
                </div>
              )}
            </div>
          )}

          {/* Camera overlay button */}
          {user && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-1 right-1 w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-[#030303] disabled:opacity-50 z-10"
              title="Alterar avatar"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !user?.id) return;

              // Validate file size (max 2MB)
              if (file.size > 2 * 1024 * 1024) {
                toast.error('Imagem muito grande. Máximo 2MB.');
                return;
              }

              setIsUploadingAvatar(true);
              try {
                const publicUrl = await supabaseService.uploadAvatar(user.id, file);
                if (publicUrl) {
                  setLocalAvatarUrl(publicUrl);
                  toast.success('Avatar atualizado!');
                  onProfileUpdate();
                }
              } catch (err) {
                toast.error('Erro ao fazer upload do avatar');
                console.error(err);
              } finally {
                setIsUploadingAvatar(false);
                // Reset file input so same file can be selected again
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
        </div>

        {user ? (
          <>
            <h2 className="text-4xl font-bold tracking-tight font-display mb-2">
              {userProfile.username || 'Cinéfilo'}
              {isPro && <ProBadge size="md" className="ml-2 align-middle" />}
            </h2>
            <p className="text-gray-400 mb-6">{user.email}</p>

            {/* Level Progress */}
            <div className="max-w-md mx-auto mb-8 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-amber-500 rounded-[2rem] opacity-30 group-hover:opacity-60 transition duration-500 blur" />
              <div className="relative glass-card p-6 rounded-3xl border border-white/10 bg-[#111]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${currentLevelData?.color || 'from-gray-500 to-gray-400'} flex items-center justify-center text-3xl shadow-lg border border-white/10`}
                    >
                      {currentLevelData?.icon || '🌱'}
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Nível {userProfile.level}</p>
                      <p className="font-bold text-xl text-white">{currentLevelData?.name || 'Novato'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                      {userProfile.xp} <span className="text-sm text-gray-400 font-sans font-normal">XP</span>
                    </p>
                  </div>
                </div>

                {userProfile.level < 10 && nextLevelData && (
                  <>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((userProfile.xp - (currentLevelData?.xpRequired || 0)) / (nextLevelData.xpRequired - (currentLevelData?.xpRequired || 0))) * 100}%`,
                        }}
                        className={`h-full bg-gradient-to-r ${nextLevelData.color}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right">
                      Faltam {nextLevelData.xpRequired - userProfile.xp} XP para o nível {userProfile.level + 1}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 text-left max-w-md mx-auto mb-8">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                Notificações
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'notify_loved', label: 'Amigos amam um filme' },
                  { key: 'notify_liked', label: 'Amigos gostam de um filme' },
                  { key: 'notify_disliked', label: 'Amigos não gostam de um filme' },
                  { key: 'notify_skipped', label: 'Amigos pulam um filme' },
                  { key: 'notify_watchlist', label: 'Amigos salvam na lista' },
                ].map((pref) => (
                  <label key={pref.key} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs[pref.key as keyof typeof notificationPrefs] || false}
                      onChange={(e) => onUpdatePreference(pref.key, e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                    />
                    {pref.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Public Profile Toggle */}
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 text-left max-w-md mx-auto mb-8">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                Perfil Público
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">Permitir que outros vejam seu perfil</p>
                <button
                  onClick={async () => {
                    if (!user?.id) return;
                    setIsTogglingPublic(true);
                    try {
                      const newIsPublic = !isPublic;
                      await supabaseService.updatePublicProfile(user.id, {
                        is_public: newIsPublic,
                        username: userProfile.username || '',
                      });
                      setIsPublic(newIsPublic);
                      toast.success(newIsPublic ? 'Perfil público ativado!' : 'Perfil público desativado');
                      onProfileUpdate();
                    } catch {
                      toast.error('Erro ao alterar visibilidade do perfil');
                    } finally {
                      setIsTogglingPublic(false);
                    }
                  }}
                  disabled={isTogglingPublic}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-purple-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  {isTogglingPublic && <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />}
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    } ${isTogglingPublic ? 'opacity-0' : ''}`}
                  />
                </button>
              </div>
              {isPublic && userProfile.username && (
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10 mt-2">
                  <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300 truncate">
                    cinematch.app/u/{userProfile.username}
                  </span>
                </div>
              )}
            </div>

            {/* Push Notifications Toggle */}
            {pushNotifications.isSupported && (
              <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 text-left max-w-md mx-auto mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notificações Push
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Receber notificações no navegador</p>
                  <button
                    onClick={() => {
                      if (!user?.id) return;
                      if (pushNotifications.isSubscribed) {
                        pushNotifications.unsubscribe(user.id);
                      } else {
                        pushNotifications.requestAndSubscribe(user.id);
                      }
                    }}
                    disabled={pushNotifications.isSubscribing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      pushNotifications.isSubscribed ? 'bg-purple-600' : 'bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    {pushNotifications.isSubscribing && <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />}
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushNotifications.isSubscribed ? 'translate-x-6' : 'translate-x-1'
                      } ${pushNotifications.isSubscribing ? 'opacity-0' : ''}`}
                    />
                  </button>
                </div>
                {pushNotifications.permission === 'denied' && (
                  <p className="text-xs text-red-400 mt-1">
                    Notificações bloqueadas pelo navegador. Altere nas configurações do site.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={onSignOut}
              className="bg-white/10 text-white font-bold py-2 px-6 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center gap-2 mx-auto border border-white/10"
            >
              Sair da conta
            </button>
          </>
        ) : (
          <div className="max-w-md mx-auto w-full glass-card p-8 rounded-[2rem] border border-white/10 text-left">
            <h2 className="text-3xl font-bold font-display mb-2 text-center">
              Bem-vindo de volta
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Entre para acessar sua biblioteca
            </p>

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <div>
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Não tem conta? Cadastre-se
              </button>
            </div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">ou</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Entrar com Google
            </button>
          </div>
        )}
      </div>

      {user && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-5xl font-bold text-white mb-2 font-display">{ratings.length}</h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Avaliados</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-5xl font-bold text-white mb-2 font-display">
            {ratings.filter(r => r.rating === 'loved').length}
          </h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Favoritos</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-2xl font-bold text-white mb-2 font-display mt-3">{
            (() => {
              const genreCounts: Record<number, number> = {};
              ratings.forEach(r => {
                if (r.movie?.genre_ids) {
                  r.movie.genre_ids.forEach(id => {
                    genreCounts[id] = (genreCounts[id] || 0) + 1;
                  });
                }
              });
              const topGenreId = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
              const topGenre = topGenreId ? GENRES.find(g => g.id === Number(topGenreId)) : null;
              return topGenre?.name || 'Ficção';
            })()
          }</h3>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">Gênero Top</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-[2rem] p-8">
          <h3 className="text-2xl font-bold mb-6 font-display">Gêneros Selecionados</h3>
          <div className="flex flex-wrap gap-3">
            {GENRES.filter(g => selectedGenres.includes(g.id)).map(genre => (
              <div key={genre.id} className="bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10">
                {genre.name}
              </div>
            ))}
            <button
              onClick={onEditGenres}
              className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-white/30 text-gray-400 hover:text-white hover:border-white/60 transition-colors"
            >
              + Editar
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
          <Bot className="w-12 h-12 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2 font-display flex items-center gap-2">
            Oráculo de IA
            {!isPro && <ProBadge size="sm" />}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Deixe a Inteligência Artificial encontrar o filme perfeito com base no seu gosto.
          </p>
          <button
            onClick={handleExportForAI}
            className={`w-full text-white font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 ${
              isPro
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : 'bg-white/10 hover:bg-white/20 border border-white/10'
            }`}
          >
            {isPro ? <Sparkles className="w-5 h-5" /> : <Lock className="w-4 h-4 text-gray-400" />}
            {isPro ? 'Consultar Oráculo' : 'Desbloquear Oráculo'}
          </button>
        </div>
      </div>
      </>
      )}
    </motion.div>
  );
};
