/**
 * ProducerPublicPage — Public profile page for MrCine Pro producers
 * 
 * Redesigned with:
 * - Proper text colors (white/light on dark background)
 * - Movie blur/lock for non-logged users (only 2 visible)
 * - Beautiful card-based layout with movie grids
 * - TMDB movie data integration
 * - SEO + social sharing
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  User,
  Film,
  ListVideo,
  Star,
  ArrowRight,
  Sparkles,
  Crown,
  Clapperboard,
  PenTool,
  Megaphone,
  ExternalLink,
  AlertCircle,
  Home,
  MessageCircle,
  Twitter,
  Link2,
  Check,
  Lock,
  Eye,
  Heart,
  Play,
  TrendingUp,
  Award,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface ProducerPublicPageProps {
  username: string;
}

interface ProducerData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  custom_slug: string | null;
  role: 'influencer' | 'critic' | 'creator';
  commission_rate: number;
  created_at: string;
  status: 'approved' | 'pending';
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_youtube?: string | null;
  free_movies_limit?: number;
}

interface MovieData {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
}

interface ProducerList {
  id: string;
  title: string;
  description: string | null;
  movie_ids: number[];
  movie_data: MovieData[] | null;
  slug: string | null;
  is_published: boolean;
  view_count: number;
  like_count: number;
  movie_count: number;
  created_at: string;
}

// ─── Role Config ──────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; gradient: string }> = {
  influencer: {
    label: 'Influencer',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    gradient: 'from-pink-500 to-rose-500',
  },
  critic: {
    label: 'Crítico',
    icon: <PenTool className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    gradient: 'from-amber-500 to-orange-500',
  },
  creator: {
    label: 'Criador',
    icon: <Clapperboard className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    gradient: 'from-emerald-500 to-teal-500',
  },
};

// ─── Referral Code Helper ──────────────────────────────────────────

const getReferralCode = (username: string): string => {
  return username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
};

// ─── Free Movies Limit ────────────────────────────────────────────
const DEFAULT_FREE_MOVIE_LIMIT = 5;

// ─── Component ────────────────────────────────────────────────────

export const ProducerPublicPage: React.FC<ProducerPublicPageProps> = ({ username }) => {
  const [producer, setProducer] = useState<ProducerData | null>(null);
  const [lists, setLists] = useState<ProducerList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'not_available' | 'network' | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        // Check if user is Pro
        try {
          const res = await fetch('/api/subscription/status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setIsPro(data.is_pro || data.status === 'active');
          }
        } catch { /* ignore */ }
      }
    };
    checkAuth();
  }, []);

  // Set referral cookie on page load
  useEffect(() => {
    if (!username) return;

    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    document.cookie = `mrcine_ref=${getReferralCode(username)};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;

    try {
      localStorage.setItem(
        'mrcine_ref',
        JSON.stringify({
          code: getReferralCode(username),
          expires: expires.getTime(),
        })
      );
    } catch { /* localStorage unavailable */ }

    // Register the referral click (fire-and-forget)
    fetch('/api/producer/referral-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_code: getReferralCode(username),
        landing_page: window.location.pathname,
        user_agent: navigator.userAgent,
      }),
    }).catch(() => { /* silent fail */ });
  }, [username]);

  // Fetch producer data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const producerRes = await fetch(`/api/producer/producers/${encodeURIComponent(username)}`);
        if (!producerRes.ok) {
          if (producerRes.status === 404) {
            setError('not_found');
          } else {
            setError('network');
          }
          setLoading(false);
          return;
        }

        const response = await producerRes.json();
        const producerData: ProducerData = response.producer || response;

        if (!producerData || producerData.status !== 'approved') {
          setError('not_available');
          setLoading(false);
          return;
        }

        setProducer(producerData);

        // Fetch producer's lists
        try {
          const listsRes = await fetch(`/api/producer/producers/${encodeURIComponent(producerData.username)}/lists`);
          if (listsRes.ok) {
            const listsResponse = await listsRes.json();
            const listsData: ProducerList[] = listsResponse.lists || listsResponse || [];
            setLists(Array.isArray(listsData) ? listsData.filter((l) => l.is_published) : []);
          }
        } catch {
          // Lists are optional
        }
      } catch {
        setError('network');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  // ─── Compute Stats ───────────────────────────────────────────────
  const totalMovies = lists.reduce((acc, list) => {
    return acc + (list.movie_data?.length || list.movie_ids?.length || list.movie_count || 0);
  }, 0);

  const totalViews = lists.reduce((acc, list) => acc + (list.view_count || 0), 0);

  // ─── Can user see all movies? ────────────────────────────────────
  const canSeeAllMovies = isLoggedIn && isPro;

  // ─── Share URL ───────────────────────────────────────────────────
  const shareUrl = `https://mrcine.pro/p/${producer?.username || username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const toggleListExpand = (listId: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  // ─── JSON-LD Structured Data ─────────────────────────────────────
  const jsonLd = producer ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": producer.display_name,
    "url": shareUrl,
    "image": producer.avatar_url || 'https://mrcine.pro/og-default.png',
    "description": producer.bio || `Perfil de ${producer.display_name} no MrCine Pro`,
    "sameAs": [
      producer.social_instagram ? `https://instagram.com/${producer.social_instagram}` : null,
      producer.social_tiktok ? `https://tiktok.com/@${producer.social_tiktok}` : null,
      producer.social_youtube ? `https://youtube.com/@${producer.social_youtube}` : null,
    ].filter(Boolean),
  }) : null;

  // ─── Loading State ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-gray-400 font-medium">Carregando perfil...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Not Found State ──────────────────────────────────────────────
  if (error === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Helmet>
          <title>Produtor nao encontrado - MrCine Pro</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-6 relative z-10"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/10">
            <AlertCircle className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Produtor nao encontrado</h1>
          <p className="text-gray-400 mb-8">
            Este perfil de produtor nao existe ou foi removido.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Not Available State ──────────────────────────────────────────
  if (error === 'not_available') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Helmet>
          <title>Perfil nao disponivel - MrCine Pro</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-6 relative z-10"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/10">
            <User className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Perfil nao disponivel</h1>
          <p className="text-gray-400 mb-8">
            Este perfil ainda nao esta disponivel publicamente.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Network Error State ──────────────────────────────────────────
  if (error === 'network' || !producer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Helmet>
          <title>Erro ao carregar - MrCine Pro</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-6 relative z-10"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/10">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Erro ao carregar</h1>
          <p className="text-gray-400 mb-8">
            Nao foi possivel carregar este perfil. Tente novamente mais tarde.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Producer Profile Page ────────────────────────────────────────
  const roleConfig = ROLE_CONFIG[producer.role] || ROLE_CONFIG.creator;
  const referralUrl = `/?ref=${encodeURIComponent(getReferralCode(producer.username))}`;
  const ogImageUrl = producer.avatar_url || 'https://mrcine.pro/og-default.png';
  const metaDescription = `${producer.bio || `Perfil de ${producer.display_name} no MrCine Pro`}. Descubra filmes perfeitos para voce!`;

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* ── SEO: Dynamic Meta Tags ──────────────────────────────────── */}
      <Helmet>
        <title>{producer.display_name} (@{producer.username}) - MrCine Pro</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${producer.display_name} no MrCine Pro`} />
        <meta property="og:description" content={producer.bio || `Veja as recomendacoes de ${producer.display_name}`} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:site_name" content="MrCine Pro" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${producer.display_name} no MrCine Pro`} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {jsonLd}
        </script>
      )}

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      {/* ── HERO BANNER ────────────────────────────────────────────── */}
      <div className="relative z-10">
        {/* Gradient banner background */}
        <div className={`h-48 sm:h-56 bg-gradient-to-br ${roleConfig.gradient} opacity-20`} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030303]" />

        <div className="max-w-4xl mx-auto px-4 relative">
          {/* Avatar - overlapping the banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0a0a0a] border-4 border-[#030303] flex items-center justify-center overflow-hidden -mt-14 sm:-mt-16 relative z-20 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
          >
            {producer.avatar_url ? (
              <img
                src={producer.avatar_url}
                alt={producer.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 flex items-center justify-center">
                <User className="w-14 h-14 text-purple-300/60" />
              </div>
            )}
          </motion.div>

          {/* Profile Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mt-4 mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {producer.display_name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">@{producer.username}</p>

            {/* Role Badge */}
            <div className="flex justify-center mt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${roleConfig.bg} ${roleConfig.color}`}
              >
                {roleConfig.icon}
                {roleConfig.label}
              </span>
            </div>

            {/* Bio */}
            {producer.bio && (
              <p className="text-gray-400 max-w-lg mx-auto leading-relaxed text-sm mt-4">
                {producer.bio}
              </p>
            )}

            {/* Social Links */}
            {(producer.social_instagram || producer.social_tiktok || producer.social_youtube) && (
              <div className="flex gap-3 justify-center mt-4">
                {producer.social_instagram && (
                  <a
                    href={`https://instagram.com/${producer.social_instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-pink-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {producer.social_tiktok && (
                  <a
                    href={`https://tiktok.com/@${producer.social_tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.27 8.27 0 005.58 2.16V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/></svg>
                  </a>
                )}
                {producer.social_youtube && (
                  <a
                    href={`https://youtube.com/@${producer.social_youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Stats Row ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-3 gap-3 mb-10"
          >
            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <ListVideo className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">{lists.length}</h3>
                <p className="text-gray-500 uppercase tracking-wider text-[10px] mt-0.5 font-medium">
                  {lists.length === 1 ? 'Lista' : 'Listas'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <Film className="w-5 h-5 text-pink-400 mx-auto mb-1.5" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">{totalMovies}</h3>
                <p className="text-gray-500 uppercase tracking-wider text-[10px] mt-0.5 font-medium">
                  {totalMovies === 1 ? 'Filme' : 'Filmes'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <Eye className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">{totalViews}</h3>
                <p className="text-gray-500 uppercase tracking-wider text-[10px] mt-0.5 font-medium">
                  Visualizacoes
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Movie Lists ───────────────────────────────────────────── */}
          {lists.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6 mb-12"
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                Listas de Curadoria
              </h2>

              {lists.map((list, listIndex) => {
                const movies = list.movie_data && list.movie_data.length > 0 ? list.movie_data : [];
                const isExpanded = expandedLists.has(list.id);
                const freeLimit = producer?.free_movies_limit || DEFAULT_FREE_MOVIE_LIMIT;
                const visibleMovies = canSeeAllMovies || isExpanded ? movies : movies.slice(0, freeLimit);
                const hasLockedMovies = !canSeeAllMovies && movies.length > freeLimit;
                const lockedCount = movies.length - freeLimit;

                return (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.45 + listIndex * 0.1 }}
                    className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/20 transition-colors duration-300"
                  >
                    {/* List Header */}
                    <div className="p-5 sm:p-6 border-b border-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white truncate">{list.title}</h3>
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Film className="w-2.5 h-2.5" />
                              {movies.length}
                            </span>
                          </div>
                          {list.description && (
                            <p className="text-gray-400 text-sm leading-relaxed">{list.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          {list.view_count || 0}
                        </div>
                      </div>
                    </div>

                    {/* Movie Grid */}
                    {movies.length > 0 ? (
                      <div className="p-5 sm:p-6">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {visibleMovies.map((movie, idx) => (
                            <a
                              key={movie.id}
                              href={`https://www.themoviedb.org/movie/${movie.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/movie relative"
                            >
                              <div className="rounded-xl overflow-hidden border border-white/5 transition-all duration-300 group-hover/movie:border-purple-500/30 group-hover/movie:shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover/movie:scale-[1.03]">
                                {movie.poster_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-full aspect-[2/3] object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center">
                                    <Film className="w-6 h-6 text-gray-600" />
                                  </div>
                                )}
                              </div>
                              {/* Movie title overlay */}
                              <div className="mt-1.5">
                                <p className="text-white text-[11px] sm:text-xs font-medium truncate">
                                  {movie.title}
                                </p>
                                {movie.vote_average > 0 && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                    <span className="text-[9px] sm:text-[10px] text-gray-500">
                                      {movie.vote_average.toFixed(1)}
                                    </span>
                                    {movie.release_date && (
                                      <span className="text-[9px] sm:text-[10px] text-gray-600">
                                        {movie.release_date.substring(0, 4)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </a>
                          ))}

                          {/* Locked movies placeholder */}
                          {hasLockedMovies && !isExpanded && (
                            <div className="col-span-3 sm:col-span-4 md:col-span-5 mt-2">
                              <div className="bg-gradient-to-r from-purple-900/20 to-fuchsia-900/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                    <Lock className="w-5 h-5 text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-medium">
                                      +{lockedCount} filme{lockedCount !== 1 ? 's' : ''} exclusivo{lockedCount !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      Seja Pro para ver todas as recomendacoes
                                    </p>
                                  </div>
                                </div>
                                <Link
                                  to="/pricing"
                                  className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Seja Pro
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                          <Film className="w-5 h-5 text-gray-600" />
                          <p>Os filmes desta lista estao carregando...</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ── CTA Section ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-10"
          >
            <div className="bg-gradient-to-br from-purple-900/30 via-fuchsia-900/20 to-purple-900/10 border border-purple-500/20 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-fuchsia-600/5 animate-pulse" />

              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.65, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Descubra Seu Perfil Cinematografico
                </h2>
                <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                  Responda algumas perguntas e deixe a IA do MrCine encontrar os filmes perfeitos para voce.
                </p>

                <a
                  href={referralUrl}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:scale-[1.02] text-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Comecar Agora
                  <ArrowRight className="w-5 h-5" />
                </a>

                <p className="text-gray-500 text-sm mt-4">
                  Gratis - 2 minutos - Recomendacoes com IA
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Social Share Buttons ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mb-12"
          >
            <p className="text-center text-gray-500 text-sm mb-3">Compartilhar perfil</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${producer.display_name} recomenda: Descubra seu perfil cinematografico! ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/15 text-green-400 hover:bg-green-600/25 border border-green-600/20 transition-all duration-200 hover:scale-[1.02]"
              >
                <MessageCircle size={18} />
                <span className="text-sm font-medium">WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Descubra seu perfil cinematografico com ${producer.display_name}!`)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/20 transition-all duration-200 hover:scale-[1.02]"
              >
                <Twitter size={18} />
                <span className="text-sm font-medium">Twitter</span>
              </a>

              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                  linkCopied
                    ? 'bg-emerald-600/15 text-emerald-400 border-emerald-600/20'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check size={18} />
                    <span className="text-sm font-medium">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Link2 size={18} />
                    <span className="text-sm font-medium">Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center pb-8"
          >
            <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
              <span className="text-lg">🎬</span>
              <span>
                Powered by{' '}
                <a
                  href="/"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  MrCine Pro
                </a>
              </span>
            </div>
          </motion.footer>
        </div>
      </div>
    </div>
  );
};

export default ProducerPublicPage;
