/**
 * ProducerPublicPage — Public profile page for MrCine Pro producers
 * 
 * Displays an influencer/critic/creator's public profile at /p/:username
 * with their movie lists and a CTA to try MrCine Pro via referral link.
 * 
 * SEO: Dynamic meta tags (via react-helmet-async), Open Graph, Twitter Cards,
 *      JSON-LD structured data, canonical URL
 * Social: WhatsApp, Twitter/X, Copy Link share buttons
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  created_at: string;
}

// ─── Role Config ──────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  influencer: {
    label: 'Influencer',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  critic: {
    label: 'Crítico',
    icon: <PenTool className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  creator: {
    label: 'Criador',
    icon: <Clapperboard className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

// ─── Referral Code Helper ──────────────────────────────────────────

const getReferralCode = (username: string): string => {
  return username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
};

// ─── Component ────────────────────────────────────────────────────

export const ProducerPublicPage: React.FC<ProducerPublicPageProps> = ({ username }) => {
  const [producer, setProducer] = useState<ProducerData | null>(null);
  const [lists, setLists] = useState<ProducerList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'not_available' | 'network' | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Set referral cookie on page load
  useEffect(() => {
    if (!username) return;

    // Set the mrcine_ref cookie with the producer's username as referral code
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    document.cookie = `mrcine_ref=${getReferralCode(username)};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;

    // Also store in localStorage as fallback
    try {
      localStorage.setItem(
        'mrcine_ref',
        JSON.stringify({
          code: getReferralCode(username),
          expires: expires.getTime(),
        })
      );
    } catch {
      /* localStorage unavailable */
    }

    // Register the referral click (fire-and-forget)
    fetch('/api/producer/referral-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_code: getReferralCode(username),
        landing_page: window.location.pathname,
        user_agent: navigator.userAgent,
      }),
    }).catch(() => {
      /* silent fail */
    });
  }, [username]);

  // Fetch producer data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch producer profile
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
        const producerData: ProducerData = response.producer || response; // handle both wrapped and unwrapped

        // Check if producer is approved
        if (!producerData || producerData.status !== 'approved') {
          setError('not_available');
          setLoading(false);
          return;
        }

        setProducer(producerData);

        // Fetch producer's lists
        try {
          const listsRes = await fetch(`/api/producer/producers/${encodeURIComponent(username)}/lists`);
          if (listsRes.ok) {
            const listsResponse = await listsRes.json();
            const listsData: ProducerList[] | never[] = listsResponse.lists || listsResponse || [];
            setLists(Array.isArray(listsData) ? listsData.filter((l) => l.is_published) : []);
          }
        } catch {
          // Lists are optional, don't fail the whole page
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
    return acc + (list.movie_data?.length || list.movie_ids?.length || 0);
  }, 0);

  // ─── Share URL ───────────────────────────────────────────────────
  const shareUrl = `https://mrcine.pro/p/${username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
        {/* Ambient glow */}
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
          <title>Produtor não encontrado — MrCine Pro</title>
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
          <h1 className="text-3xl font-bold mb-3">Produtor não encontrado</h1>
          <p className="text-gray-400 mb-8">
            Este perfil de produtor não existe ou foi removido.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao início
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
          <title>Perfil não disponível — MrCine Pro</title>
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
          <h1 className="text-3xl font-bold mb-3">Perfil não disponível</h1>
          <p className="text-gray-400 mb-8">
            Este perfil ainda não está disponível publicamente.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao início
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
          <title>Erro ao carregar — MrCine Pro</title>
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
          <h1 className="text-3xl font-bold mb-3">Erro ao carregar</h1>
          <p className="text-gray-400 mb-8">
            Não foi possível carregar este perfil. Tente novamente mais tarde.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]"
          >
            <Home className="w-5 h-5" />
            Voltar ao início
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Producer Profile Page ────────────────────────────────────────
  const roleConfig = ROLE_CONFIG[producer.role] || ROLE_CONFIG.creator;
  const referralUrl = `/?ref=${encodeURIComponent(getReferralCode(producer.username))}`;
  const ogImageUrl = producer.avatar_url || 'https://mrcine.pro/og-default.png';
  const metaDescription = `${producer.bio || `Perfil de ${producer.display_name} no MrCine Pro`}. Descubra filmes perfeitos para você!`;

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* ── SEO: Dynamic Meta Tags ──────────────────────────────────── */}
      <Helmet>
        <title>{producer.display_name} (@{producer.username}) — MrCine Pro</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={shareUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${producer.display_name} no MrCine Pro`} />
        <meta property="og:description" content={producer.bio || `Veja as recomendações de ${producer.display_name} e descubra seu perfil cinematográfico`} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:site_name" content="MrCine Pro" />
        <meta property="profile:username" content={producer.username} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${producer.display_name} no MrCine Pro`} />
        <meta name="twitter:description" content={producer.bio || `Recomendações de filmes por ${producer.display_name}`} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      {/* ── SEO: JSON-LD Structured Data ────────────────────────────── */}
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

      <div className="relative z-10 max-w-3xl mx-auto w-full px-4 py-8 sm:py-16">
        {/* ── Hero Section ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center border-2 border-purple-500/30 overflow-hidden mb-6 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
          >
            {producer.avatar_url ? (
              <img
                src={producer.avatar_url}
                alt={producer.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-14 h-14 text-gray-500" />
            )}
          </motion.div>

          {/* Display Name */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          >
            {producer.display_name}
          </motion.h1>

          {/* Username */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-gray-500 text-sm mb-3"
          >
            @{producer.username}
          </motion.p>

          {/* Role Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex justify-center mb-4"
          >
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${roleConfig.bg} ${roleConfig.color}`}
            >
              {roleConfig.icon}
              {roleConfig.label}
            </span>
          </motion.div>

          {/* Bio */}
          {producer.bio && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="text-gray-400 max-w-lg mx-auto leading-relaxed text-base"
            >
              {producer.bio}
            </motion.p>
          )}
        </motion.div>

        {/* ── Stats Row ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 gap-4 mb-10"
        >
          {/* Lists count */}
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <ListVideo className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl sm:text-3xl font-bold text-white">{lists.length}</h3>
              <p className="text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs mt-1 font-medium">
                {lists.length === 1 ? 'Lista' : 'Listas'}
              </p>
            </div>
          </div>

          {/* Total movies */}
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <Film className="w-5 h-5 text-pink-400 mx-auto mb-2" />
              <h3 className="text-2xl sm:text-3xl font-bold text-white">{totalMovies}</h3>
              <p className="text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs mt-1 font-medium">
                {totalMovies === 1 ? 'Filme' : 'Filmes'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Movie Lists ───────────────────────────────────────────── */}
        {lists.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-6 mb-12"
          >
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-400" />
              Listas Curadoria
            </h2>

            {lists.map((list, listIndex) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55 + listIndex * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
              >
                {/* List Header */}
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-white mb-1">{list.title}</h3>
                  {list.description && (
                    <p className="text-gray-400 text-sm leading-relaxed">{list.description}</p>
                  )}
                </div>

                {/* Movie Posters - Horizontal Scroll */}
                {list.movie_data && list.movie_data.length > 0 ? (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                      {list.movie_data.map((movie) => (
                        <a
                          key={movie.id}
                          href={`https://www.themoviedb.org/movie/${movie.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 group/movie"
                        >
                          <div className="w-[110px] sm:w-[130px] rounded-xl overflow-hidden border border-white/5 transition-all duration-300 group-hover/movie:border-purple-500/30 group-hover/movie:shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover/movie:scale-[1.03]">
                            {movie.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                alt={movie.title}
                                className="w-full aspect-[2/3] object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center">
                                <Film className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                            {/* Movie info overlay */}
                            <div className="p-2 bg-black/40">
                              <p className="text-white text-[10px] sm:text-xs font-medium truncate">
                                {movie.title}
                              </p>
                              {movie.vote_average > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                  <span className="text-[9px] sm:text-[10px] text-gray-400">
                                    {movie.vote_average.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    <p className="text-gray-600 text-xs mt-2">
                      ← Deslize para ver mais →
                    </p>
                  </div>
                ) : (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <p className="text-gray-500 text-sm italic">Nenhum filme nesta lista ainda.</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── CTA Section ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            {/* Subtle animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-fuchsia-600/5 animate-pulse" />

            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Descubra Seu Perfil Cinematográfico
              </h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                Responda algumas perguntas e deixe a IA do MrCine encontrar os filmes perfeitos para você.
              </p>

              <a
                href={referralUrl}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:scale-[1.02] text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </a>

              <p className="text-gray-500 text-sm mt-4">
                Grátis • 2 minutos • Recomendações com IA
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Social Share Buttons ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.72 }}
          className="mb-12"
        >
          <p className="text-center text-gray-500 text-sm mb-3">Compartilhar perfil</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${producer.display_name} recomenda: Descubra seu perfil cinematográfico! ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/15 text-green-400 hover:bg-green-600/25 border border-green-600/20 transition-all duration-200 hover:scale-[1.02]"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-medium">WhatsApp</span>
            </a>

            {/* Twitter/X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Descubra seu perfil cinematográfico com ${producer.display_name}! 🎬`)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/20 transition-all duration-200 hover:scale-[1.02]"
            >
              <Twitter size={18} />
              <span className="text-sm font-medium">Twitter</span>
            </a>

            {/* Copy Link */}
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
  );
};

export default ProducerPublicPage;
