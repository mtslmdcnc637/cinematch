/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GENRES, LEVELS } from './constants';
import { fetchPopularMovies, fetchDiscoverMovies, searchMovies, fetchMovieById, fetchMovieTrailers, fetchMovieProviders } from './services/tmdbService';
import { supabaseService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import { Movie, Rating, UserRating, WatchlistItem, UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ThumbsUp, ThumbsDown, EyeOff, Film, Library, Sparkles, User, Check, Star, Calendar, Clapperboard, Info, PlayCircle, Bookmark, Trash2, Lightbulb, RefreshCw, Search, Share2, Bot, X, Users, UserPlus, Bell } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Stories } from './components/Stories';
import QuizApp from './components/quiz/QuizApp';

export default function App() {
  // Check if we are on the quiz route
  if (window.location.pathname === '/quiz') {
    return <QuizApp />;
  }

  const [currentPage, setCurrentPage] = useState('onboarding');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [libraryTab, setLibraryTab] = useState<'rated' | 'watchlist' | 'skipped'>('rated');

  // New States for Feed & Infinite Scroll
  const [feedPage, setFeedPage] = useState(1);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // New States for Dica do Dia
  const [dailyTip, setDailyTip] = useState<Movie | null>(null);
  const [dailyTipReason, setDailyTipReason] = useState("");
  const [dailyTipGenre, setDailyTipGenre] = useState<number | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<Record<number, any>>({});
  
  const getProviders = async (movieId: number) => {
    if (providers[movieId]) return;
    const p = await fetchMovieProviders(movieId);
    setProviders(prev => ({ ...prev, [movieId]: p }));
  };
  
  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Notification Preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    notify_loved: true,
    notify_liked: false,
    notify_disliked: false,
    notify_skipped: false,
    notify_watchlist: false
  });

  // Level Up State
  const [userProfile, setUserProfile] = useState<UserProfile>({ xp: 0, level: 1 });
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevelData, setNewLevelData] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      supabaseService.getNotifications(user.id).then(setNotifications).catch(err => console.error("Error fetching notifications:", err));
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) return;

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error.message);
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
          supabase.auth.signOut().catch(console.error);
        }
      }
      setUser(session?.user ?? null);
      if (!session) setIsInitialLoading(false);
    }).catch(err => {
      console.error("Unexpected session error:", err);
      setIsInitialLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      if (!session) setIsInitialLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabaseService.getNotificationPreferences(user.id).then(prefs => {
        if (prefs) setNotificationPrefs(prefs);
      }).catch(err => console.error("Error fetching preferences:", err));
    }
  }, [user]);

  const handleUpdatePreference = async (key: string, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    if (user) {
      await supabaseService.updateNotificationPreferences(user.id, { [key]: value });
      toast.success('Preferências salvas!');
    }
  };


  useEffect(() => {
    if (user) {
      // Fetch Profile
      supabaseService.getProfile(user.id).then(async (profile) => {
        if (profile) {
          // Sync email if missing
          if (!profile.email && user.email) {
            await supabaseService.updateProfile(user.id, { ...profile, email: user.email });
            profile.email = user.email;
          }
          setUserProfile(profile);
          if (profile.selectedGenres && profile.selectedGenres.length >= 3) {
            setSelectedGenres(profile.selectedGenres);
            setCurrentPage('feed');
          }
        } else {
          setUserProfile({ id: user.id, email: user.email, xp: 0, level: 1 });
        }
        setIsInitialLoading(false);
      }).catch(err => {
        console.error("Error fetching profile:", err);
        setIsInitialLoading(false);
      });

      // Fetch Ratings
      supabaseService.getRatings(user.id).then(data => {
        if (data && data.length > 0) {
          setRatings(data);
        }
      }).catch(err => console.error("Error fetching ratings:", err));

      // Fetch Watchlist
      supabaseService.getWatchlist(user.id).then(data => {
        if (data && data.length > 0) {
          setWatchlist(data);
        }
      }).catch(err => console.error("Error fetching watchlist:", err));
    } else {
      setUserProfile({ xp: 0, level: 1 });
      setIsInitialLoading(false);
    }
  }, [user]);

  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (user && currentPage === 'friends') {
      supabaseService.getFriends(user.id)
        .then(setFriends)
        .catch(err => console.error("Error fetching friends:", err));
      supabaseService.getFriendRequests(user.id)
        .then(setFriendRequests)
        .catch(err => console.error("Error fetching friend requests:", err));
    }
  }, [user, currentPage]);

  // New States for Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Rating Animation State
  const [ratingAnimation, setRatingAnimation] = useState<{ type: Rating, id: number } | null>(null);

  const handleSearchUsers = async () => {
    if (searchUserQuery.trim().length < 3) return;
    setIsSearchingUsers(true);
    try {
      const results = await supabaseService.searchUsers(searchUserQuery);
      setUserSearchResults(results.filter(u => u.id !== user?.id));
    } catch (error) {
      toast.error('Erro ao buscar usuários');
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    try {
      await supabaseService.sendFriendRequest(user.id, friendId);
      toast.success('Solicitação enviada!');
      setUserSearchResults(prev => prev.filter(u => u.id !== friendId));
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await supabaseService.respondToFriendRequest(requestId, status);
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      if (status === 'accepted') {
        const newFriends = await supabaseService.getFriends(user.id);
        setFriends(newFriends);
        toast.success('Solicitação aceita!');
      } else {
        toast('Solicitação recusada');
      }
    } catch (error) {
      toast.error('Erro ao responder solicitação');
    }
  };

  const handleGroupExportForAI = async () => {
    if (selectedFriends.length === 0) return;
    
    toast.loading('Analisando gostos do grupo...', { id: 'group-ai' });
    
    try {
      const groupTastes = await Promise.all(
        selectedFriends.map(async (friendId) => {
          const friend = friends.find(f => f.id === friendId);
          const tastes = await supabaseService.getFriendTastes(friendId);
          return {
            name: friend?.username || 'Amigo',
            amei: tastes?.ratings.filter(r => r.rating === 'loved').map(r => r.movie.title) || [],
            gostei: tastes?.ratings.filter(r => r.rating === 'liked').map(r => r.movie.title) || [],
            nao_gostei: tastes?.ratings.filter(r => r.rating === 'disliked').map(r => r.movie.title) || [],
            ver_depois: tastes?.watchlist.map(w => w.movie.title) || []
          };
        })
      );

      const myTastes = {
        name: 'Eu',
        amei: ratings.filter(r => r.rating === 'loved').map(r => r.movie.title),
        gostei: ratings.filter(r => r.rating === 'liked').map(r => r.movie.title),
        nao_gostei: ratings.filter(r => r.rating === 'disliked').map(r => r.movie.title),
        ver_depois: watchlist.map(w => w.movie.title)
      };

      const allTastes = [myTastes, ...groupTastes];
      
      let prompt = "Olá! Somos um grupo de amigos querendo assistir um filme juntos. Aqui estão nossos gostos:\n\n";
      
      allTastes.forEach(person => {
        prompt += `--- ${person.name} ---\n`;
        if (person.amei.length > 0) prompt += `Amei: ${person.amei.join(', ')}\n`;
        if (person.gostei.length > 0) prompt += `Gostei: ${person.gostei.join(', ')}\n`;
        if (person.nao_gostei.length > 0) prompt += `Não Gostei: ${person.nao_gostei.join(', ')}\n`;
        if (person.ver_depois.length > 0) prompt += `Ver Depois: ${person.ver_depois.join(', ')}\n`;
        prompt += "\n";
      });

      prompt += "Com base nisso, sugira 5 filmes que todos nós provavelmente gostaríamos. Explique por que cada filme é uma boa escolha para o grupo, focando nos pontos em comum dos nossos gostos.";

      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copiado para o grupo!', { id: 'group-ai' });
      setShowExportModal(true);
    } catch (error) {
      toast.error('Erro ao gerar prompt', { id: 'group-ai' });
    }
  };

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  // Initial load and genre change for Feed
  useEffect(() => {
    setIsLoading(true);
    setFeedPage(1);
    fetchDiscoverMovies(1, activeGenre || undefined).then(data => {
      setMovies(data);
      setIsLoading(false);
    });
  }, [activeGenre]);

  const getRating = (movieId: number) => ratings.find(r => r.movieId === movieId)?.rating;

  // Filter out movies that have already been rated or added to watchlist
  const unratedMovies = movies.filter(m => !getRating(m.id) && !watchlist.some(w => w.movieId === m.id));
  const currentMovie = unratedMovies[0];

  // Infinite scroll effect
  useEffect(() => {
    if (unratedMovies.length < 5 && !isLoadingMore && !isLoading && movies.length > 0) {
      setIsLoadingMore(true);
      const nextPage = feedPage + 1;
      fetchDiscoverMovies(nextPage, activeGenre || undefined).then(newMovies => {
        setMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMovies.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        setFeedPage(nextPage);
        setIsLoadingMore(false);
      });
    }
  }, [unratedMovies.length, feedPage, activeGenre, isLoadingMore, isLoading, movies.length]);

  const generateDailyTip = async (forceReload = false) => {
    setIsLoadingTip(true);
    let targetGenre = dailyTipGenre;
    let reason = "";

    const today = new Date().toISOString().split('T')[0];

    // Tentar carregar dica salva
    if (user && !forceReload) {
      const savedTip = await supabaseService.getDailyTip(user.id);
      if (savedTip && savedTip.daily_tip_date === today && savedTip.daily_tip_id) {
        const movie = await fetchMovieById(savedTip.daily_tip_id);
        setDailyTip(movie);
        setDailyTipReason("Dica do dia salva para você");
        setIsLoadingTip(false);
        return;
      }
    }

    if (!targetGenre) {
      // Analyze tastes
      const genreCounts: Record<number, number> = {};
      
      selectedGenres.forEach(id => genreCounts[id] = 5);

      ratings.forEach(r => {
        if (r.rating === 'loved' || r.rating === 'liked') {
          const movie = r.movie || movies.find(m => m.id === r.movieId);
          if (movie) {
            movie.genre_ids.forEach(id => {
              genreCounts[id] = (genreCounts[id] || 0) + (r.rating === 'loved' ? 2 : 1);
            });
          }
        }
      });

      let maxScore = 0;
      for (const [id, score] of Object.entries(genreCounts)) {
        if (score > maxScore) {
          maxScore = score;
          targetGenre = Number(id);
        }
      }

      if (!targetGenre) {
        targetGenre = GENRES[0].id;
      }
      
      const genreName = GENRES.find(g => g.id === targetGenre)?.name;
      reason = `Porque você gosta de ${genreName}`;
    } else {
      const genreName = GENRES.find(g => g.id === targetGenre)?.name;
      reason = `Dica de ${genreName} para você`;
    }

    const randomPage = Math.floor(Math.random() * 5) + 1;
    const tipMovies = await fetchDiscoverMovies(randomPage, targetGenre);
    
    const unseen = tipMovies.filter(m => !getRating(m.id) && !watchlist.some(w => w.movieId === m.id));
    
    if (unseen.length > 0) {
      const randomMovie = unseen[Math.floor(Math.random() * unseen.length)];
      setDailyTip(randomMovie);
      setDailyTipReason(reason);
      if (user) {
        await supabaseService.saveDailyTip(user.id, randomMovie.id);
      }
    } else {
      setDailyTip(null);
    }
    setIsLoadingTip(false);
  };

  useEffect(() => {
    if (currentPage === 'daily_tip') {
      generateDailyTip();
    }
  }, [currentPage, dailyTipGenre]);

  useEffect(() => {
    if (currentPage === 'search') {
      if (searchQuery.trim().length > 2) {
        const delayDebounceFn = setTimeout(() => {
          setIsSearching(true);
          searchMovies(searchQuery).then(results => {
            setSearchResults(results);
            setIsSearching(false);
          });
        }, 500);
        return () => clearTimeout(delayDebounceFn);
      } else {
        setSearchResults([]);
      }
    }
  }, [searchQuery, currentPage]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (isSignUp) {
        await supabaseService.signUpWithEmail(authEmail, authPassword, authUsername);
        toast.success('Conta criada! Verifique seu e-mail ou faça login.', { icon: '🎉' });
        setIsSignUp(false); // Switch to login mode
      } else {
        await supabaseService.signInWithEmail(authEmail, authPassword);
        toast.success('Login realizado com sucesso!', { icon: '👋' });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro na autenticação');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const saveRating = (movie: Movie, rating: Rating) => {
    const newRatings = [...ratings.filter(r => r.movieId !== movie.id), { movieId: movie.id, rating, timestamp: Date.now(), movie }];
    setRatings(newRatings);
    
    // Remove from watchlist if present
    if (watchlist.some(w => w.movieId === movie.id)) {
      const newWatchlist = watchlist.filter(w => w.movieId !== movie.id);
      setWatchlist(newWatchlist);
      
      if (user) {
        supabaseService.removeFromWatchlist(user.id, movie.id).catch(err => console.error("Error removing from watchlist", err));
      }
    }
    
    // Sync with Supabase
    if (user) {
      supabaseService.saveRating(user.id, movie, rating).catch(err => console.error("Error saving rating", err));
      console.log("userProfile:", userProfile);
      if (userProfile && userProfile.username && (rating === 'loved' || rating === 'liked')) {
        supabaseService.notifyFriends(user.id, userProfile.username, movie.title, rating).catch(err => console.error("Error notifying friends", err));
      } else {
        console.log("Not notifying friends. username:", userProfile?.username, "rating:", rating);
      }
    }

    // XP Logic
    if (rating !== 'not_seen') {
      let xpGained = 0;
      if (rating === 'loved') xpGained = 20;
      else if (rating === 'liked') xpGained = 10;
      else if (rating === 'disliked') xpGained = 5;

      setUserProfile(prev => {
        const newXp = prev.xp + xpGained;
        let newLevel = prev.level;
        
        const nextLevelData = LEVELS.find(l => l.level === prev.level + 1);
        
        if (nextLevelData && newXp >= nextLevelData.xpRequired) {
          newLevel = nextLevelData.level;
          setNewLevelData(nextLevelData);
          setShowLevelUpModal(true);
        }

        if (user) {
          supabaseService.updateXp(user.id, newXp, newLevel).catch(err => console.error("Error updating XP", err));
        }

        return { ...prev, xp: newXp, level: newLevel };
      });
    }
    
    // Visual feedback
    if (rating === 'loved') toast.success(`Você amou ${movie.title}! +20 XP`, { icon: '💖' });
    else if (rating === 'liked') toast.success(`Você gostou de ${movie.title} +10 XP`, { icon: '👍' });
    else if (rating === 'disliked') toast('Você não gostou +5 XP', { icon: '👎' });
    else toast('Ocultado', { icon: '🙈' });

    if (rating !== 'not_seen') {
      setRatingAnimation({ type: rating, id: Date.now() });
      setTimeout(() => setRatingAnimation(null), 1500);
    }

    if (editingMovie?.id === movie.id) {
      setEditingMovie(null);
    }
  };

  const handleShare = async (movie: Movie) => {
    const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    const shortText = `🎬 *${movie.title}*\n\n🍿 Encontrei essa recomendação no CineMatch! Descubra, avalie e salve filmes para assistir depois:\n${window.location.origin}`;
    
    let shared = false;

    try {
      // Tenta baixar a imagem para compartilhar como arquivo
      const response = await fetch(imageUrl, { mode: 'cors' });
      const blob = await response.blob();
      const file = new File([blob], 'poster.jpg', { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: movie.title,
          text: shortText,
          files: [file]
        });
        shared = true;
      }
    } catch (error) {
      console.error('Erro ao compartilhar com imagem:', error);
    }

    if (!shared) {
      // Fallback: Compartilha apenas o texto e o link da imagem
      const fallbackText = `${shortText}\n\n${imageUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: movie.title,
            text: fallbackText,
          });
          shared = true;
        } catch (error) {
          console.error('Error sharing text:', error);
        }
      }
      
      if (!shared) {
        navigator.clipboard.writeText(fallbackText);
        toast.success('Texto copiado para a área de transferência!');
      }
    }
  };

  const handleExportForAI = () => {
    const exportData = {
      amei: ratings.filter(r => r.rating === 'loved').map(r => r.movie?.title).filter(Boolean),
      gostei: ratings.filter(r => r.rating === 'liked').map(r => r.movie?.title).filter(Boolean),
      nao_gostei: ratings.filter(r => r.rating === 'disliked').map(r => r.movie?.title).filter(Boolean),
      pulei: ratings.filter(r => r.rating === 'not_seen').map(r => r.movie?.title).filter(Boolean),
      ver_depois: watchlist.map(w => w.movie?.title).filter(Boolean)
    };

    const prompt = `Atue como um especialista em cinema e recomendação de filmes. Abaixo está o meu histórico de interações com filmes em formato JSON, categorizado pelo que eu amei, gostei, não gostei, pulei (não quis ver) e os que adicionei para ver depois.

Com base nesse perfil de gosto, por favor, me recomende 5 filmes que NÃO estão nessa lista e que eu provavelmente vou gostar. 
Apresente as recomendações separadas por gênero e inclua em qual plataforma de streaming eu posso assisti-los no Brasil.

Aqui estão os meus dados:
${JSON.stringify(exportData, null, 2)}`;

    navigator.clipboard.writeText(prompt);
    setShowExportModal(true);
  };

  const addToWatchlist = (movie: Movie) => {
    if (!watchlist.some(w => w.movieId === movie.id)) {
      const newWatchlist = [...watchlist, { movieId: movie.id, timestamp: Date.now(), movie }];
      setWatchlist(newWatchlist);
      toast.success(`${movie.title} adicionado para ver depois!`, { icon: '🔖' });
      
      if (user) {
        supabaseService.addToWatchlist(user.id, movie).catch(err => console.error("Error adding to watchlist", err));
      }
    }
  };

  const removeFromWatchlist = (movieId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newWatchlist = watchlist.filter(w => w.movieId !== movieId);
    setWatchlist(newWatchlist);
    toast('Removido da sua lista');
    
    if (user) {
      supabaseService.removeFromWatchlist(user.id, movieId).catch(err => console.error("Error removing from watchlist", err));
    }
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const navItems = [
    { id: 'feed', label: 'Descobrir', icon: Sparkles },
    { id: 'daily_tip', label: 'Dica', icon: Lightbulb },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'friends', label: 'Amigos', icon: Users },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const getRatingIcon = (rating: Rating, className = "w-5 h-5") => {
    switch (rating) {
      case 'loved': return <Heart className={`${className} text-pink-500 fill-pink-500`} />;
      case 'liked': return <ThumbsUp className={`${className} text-emerald-500 fill-emerald-500`} />;
      case 'disliked': return <ThumbsDown className={`${className} text-red-500 fill-red-500`} />;
      case 'not_seen': return <EyeOff className={`${className} text-gray-400`} />;
    }
  };

  const GenreFilter = ({ active, onChange }: { active: number | null, onChange: (id: number | null) => void }) => (
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

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <Toaster theme="dark" position="top-center" className="font-sans" toastOptions={{
        style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
      }} />
      
      {/* Atmospheric Background */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* Header / Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display">CineMatch</h1>
          </div>
          
          {currentPage !== 'onboarding' && (
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/10 backdrop-blur-md">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-white/10 border border-white/20 rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-purple-400' : ''}`} />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                title="Notificações"
              >
                <Bell className="w-5 h-5 text-gray-300" />
                {notifications.some(n => !n.is_read) && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                title="Como funciona"
              >
                <Info className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUpModal && newLevelData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowLevelUpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-sm glass-card rounded-[3rem] p-8 text-center border border-white/20 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${newLevelData.color} opacity-20`} />
              
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${newLevelData.color} flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(255,255,255,0.3)] mb-6 relative z-10`}
              >
                {newLevelData.icon}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative z-10"
              >
                <p className="text-gray-300 font-medium uppercase tracking-widest text-sm mb-2">Você subiu para o Nível {newLevelData.level}!</p>
                <h2 className="text-4xl font-bold font-display mb-4 text-white">{newLevelData.name}</h2>
                <p className="text-gray-400 mb-8">Continue avaliando filmes para desbloquear novas conquistas.</p>
                
                <button
                  onClick={() => setShowLevelUpModal(false)}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-105 transition-transform"
                >
                  Incrível!
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Notificações</h2>
            {notifications.length === 0 ? (
              <p className="text-gray-400">Nenhuma notificação.</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-lg border ${n.is_read ? 'bg-white/5 border-white/10' : 'bg-purple-900/20 border-purple-500/30'}`}>
                    <p className="text-white">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-3 mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl glass-card rounded-[2rem] p-8 md:p-10 text-left border border-white/20 my-8"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowHelpModal(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold font-display text-white">Como funciona?</h2>
                  <p className="text-gray-400">O guia definitivo do CineMatch</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
                  <div className="mt-1"><Film className="w-6 h-6 text-purple-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">O Feed Infinito</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Descubra filmes baseados nos seus gêneros favoritos. Avalie como <strong>Amei</strong>, <strong>Gostei</strong> ou <strong>Não Gostei</strong> para treinar o seu perfil, ou salve para <strong>Ver Depois</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
                  <div className="mt-1"><Star className="w-6 h-6 text-amber-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sistema de Níveis (XP)</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Cada avaliação rende experiência (XP). Suba de nível e evolua de um simples <em>Novato</em> para uma <em>Entidade Cósmica</em> do cinema!
                      <br/><span className="text-sm text-gray-400 mt-2 block">Amei: +20 XP | Gostei: +10 XP | Não Gostei: +5 XP</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
                  <div className="mt-1"><Bot className="w-6 h-6 text-emerald-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Oráculo de IA</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Vai assistir com os amigos e não conseguem decidir? Vá na aba <strong>Amigos</strong>, selecione com quem vai assistir e clique em <em>Exportar para IA</em>. Cole o texto no ChatGPT ou Gemini e deixe a inteligência artificial encontrar o filme perfeito que agrada a todos!
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
                  <div className="mt-1"><Library className="w-6 h-6 text-blue-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sua Biblioteca na Nuvem</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Crie uma conta para salvar automaticamente todas as suas avaliações, níveis e lista de "Ver Depois" na nuvem. Acesse de qualquer dispositivo sem perder nada.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="bg-white text-black font-bold py-4 px-10 rounded-full hover:scale-105 transition-transform"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-24 md:pb-12 min-h-screen flex flex-col">
        {isInitialLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-purple-500 opacity-50" />
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentPage === 'onboarding' ? (
              onboardingStep === 0 ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12 px-4"
                >
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 rounded-full" />
                    <div className="relative w-32 h-32 rounded-full glass-card flex items-center justify-center border border-purple-500/30">
                      <Sparkles className="w-16 h-16 text-purple-400" />
                    </div>
                  </div>
                  
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tighter font-display text-white">
                    Nunca mais brigue para escolher um filme!
                  </h2>
                  <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                    O CineMatch ajuda você e seus amigos a descobrirem filmes que todo mundo vai amar. É fácil, divertido e acaba com a dúvida na hora de assistir algo novo.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 mb-12 w-full">
                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                      <div className="text-3xl mb-4">🍿</div>
                      <h3 className="font-bold text-lg mb-2">Descubra</h3>
                      <p className="text-sm text-gray-400">Veja filmes que combinam com o seu gosto.</p>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                      <div className="text-3xl mb-4">⭐</div>
                      <h3 className="font-bold text-lg mb-2">Avalie</h3>
                      <p className="text-sm text-gray-400">Diga o que achou e suba de nível!</p>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                      <div className="text-3xl mb-4">👥</div>
                      <h3 className="font-bold text-lg mb-2">Combine</h3>
                      <p className="text-sm text-gray-400">A IA encontra o filme perfeito pro grupo.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                      Criar minha conta grátis
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage('profile')}
                      className="group relative inline-flex items-center justify-center gap-3 bg-white/10 text-white px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 hover:bg-white/20 hover:scale-105"
                    >
                      Já tenho conta
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="onboarding-genres"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12"
                >
                  <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                    O que você curte?
                  </h2>
                  <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                    Selecione pelo menos 3 gêneros para calibrarmos o nosso algoritmo e encontrarmos os filmes perfeitos para você.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-3 mb-16">
                    {GENRES.map((genre, i) => {
                      const isSelected = selectedGenres.includes(genre.id);
                      return (
                        <motion.button
                          key={genre.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleGenre(genre.id)}
                          className={`flex items-center gap-2 px-6 py-3.5 rounded-full border backdrop-blur-md transition-all duration-300 ${
                            isSelected 
                              ? 'bg-purple-600/80 text-white border-purple-400 shadow-[0_0_30px_rgba(147,51,234,0.4)]' 
                              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                          <span className="font-medium tracking-wide">{genre.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={async () => {
                      if (user) {
                        try {
                          await supabaseService.updateProfile(user.id, { selectedGenres });
                          setCurrentPage('feed');
                        } catch (error) {
                          console.error("Error saving genres:", error);
                          toast.error("Erro ao salvar gêneros. Verifique o console para mais detalhes.");
                        }
                      } else {
                        setCurrentPage('feed');
                      }
                    }}
                    disabled={selectedGenres.length < 3}
                    className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                  >
                    Começar a Experiência
                    <Film className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.div>
              )
            ) : currentPage === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-start max-w-md mx-auto w-full pt-2"
            >
              <GenreFilter active={activeGenre} onChange={setActiveGenre} />

              {isLoading && movies.length === 0 ? (
                <div className="w-full aspect-[2/3] rounded-[2rem] glass-card animate-pulse flex items-center justify-center mt-4">
                  <Sparkles className="w-12 h-12 text-white/20 animate-spin-slow" />
                </div>
              ) : currentMovie ? (
                <AnimatePresence mode="popLayout">
                  <motion.div 
                    key={currentMovie.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20, filter: "blur(10px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full relative group mt-4"
                  >
                    {/* Cinematic Card */}
                    <div className="relative w-full h-[60vh] max-h-[550px] min-h-[400px] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-[#111]">
                      {currentMovie.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w780${currentMovie.poster_path}`} 
                          alt={currentMovie.title} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
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
                      <div className="absolute top-4 left-4 z-10" onMouseEnter={() => getProviders(currentMovie.id)}>
                        <div className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg cursor-pointer hover:bg-white/20 transition-colors">
                          <PlayCircle className="w-5 h-5 text-white" />
                        </div>
                        {providers[currentMovie.id] && (
                          <div className="absolute top-14 left-0 bg-black/90 p-3 rounded-lg text-white text-xs w-48 z-20 border border-white/10 shadow-xl">
                            <p className="font-bold mb-1 text-purple-400">Onde assistir:</p>
                            {providers[currentMovie.id].flatrate?.map((p: any) => p.provider_name).join(', ') || 'Indisponível em streaming no momento'}
                          </div>
                        )}
                      </div>

                      {/* Share Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(currentMovie);
                        }}
                        className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors z-10"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      {/* Movie Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-amber-400">
                            <Star className="w-4 h-4 fill-amber-400" />
                            {currentMovie.vote_average.toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-sm font-medium text-gray-300">
                            <Calendar className="w-4 h-4" />
                            {currentMovie.release_date?.split('-')[0]}
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display leading-tight tracking-tight break-words">
                          {currentMovie.title}
                        </h2>
                        <p className="text-gray-300 text-sm leading-relaxed mb-12 line-clamp-4">
                          {currentMovie.overview}
                        </p>
                      </div>
                    </div>

                    {/* Floating Action Bar */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                      <RatingButton 
                        onClick={() => saveRating(currentMovie, 'not_seen')} 
                        icon={<EyeOff className="w-5 h-5" />} 
                        colorClass="text-gray-400 hover:text-white hover:bg-white/10"
                        tooltip="Pular"
                      />
                      <RatingButton 
                        onClick={() => saveRating(currentMovie, 'disliked')} 
                        icon={<ThumbsDown className="w-5 h-5" />} 
                        colorClass="text-red-500 hover:bg-red-500/20"
                        tooltip="Não Gostei"
                      />
                      <RatingButton 
                        onClick={() => addToWatchlist(currentMovie)} 
                        icon={<Bookmark className="w-5 h-5" />} 
                        colorClass="text-blue-400 hover:bg-blue-500/20"
                        tooltip="Ver Depois"
                      />
                      <RatingButton 
                        onClick={() => saveRating(currentMovie, 'liked')} 
                        icon={<ThumbsUp className="w-5 h-5" />} 
                        colorClass="text-emerald-500 hover:bg-emerald-500/20"
                        tooltip="Gostei"
                      />
                      <RatingButton 
                        onClick={() => saveRating(currentMovie, 'loved')} 
                        icon={<Heart className="w-5 h-5" />} 
                        colorClass="text-pink-500 hover:bg-pink-500/20"
                        tooltip="Amei"
                        large
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
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
            ) : currentPage === 'search' ? (
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
                  <Sparkles className="w-12 h-12 text-white/20 animate-spin-slow" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {searchResults.map(movie => (
                    <motion.div 
                      key={movie.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                      onClick={() => setEditingMovie(movie)}
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
                            {getRatingIcon(getRating(movie.id)!, "w-4 h-4")}
                          </div>
                        )}

                        <div className="absolute top-3 left-3" onMouseEnter={() => getProviders(movie.id)}>
                          <div className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
                            <PlayCircle className="w-4 h-4 text-white" />
                          </div>
                          {providers[movie.id] && (
                            <div className="absolute top-10 left-0 bg-black/90 p-3 rounded-lg text-white text-xs w-40 z-10">
                              <p className="font-bold mb-1">Onde assistir:</p>
                              {providers[movie.id].flatrate?.map((p: any) => p.provider_name).join(', ') || 'Indisponível'}
                            </div>
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                          <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                            <Star className="w-3 h-3 text-amber-400" />
                            <span>{movie.vote_average.toFixed(1)}</span>
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
            ) : currentPage === 'daily_tip' ? (
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
                  <Sparkles className="w-12 h-12 text-white/20 animate-spin-slow" />
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
                      {providers[dailyTip.id] && (
                        <div className="absolute top-14 left-0 bg-black/90 p-3 rounded-lg text-white text-xs w-48 z-20 border border-white/10 shadow-xl">
                          <p className="font-bold mb-1 text-purple-400">Onde assistir:</p>
                          {providers[dailyTip.id].flatrate?.map((p: any) => p.provider_name).join(', ') || 'Indisponível em streaming no momento'}
                        </div>
                      )}
                    </div>

                    {/* Share Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(dailyTip);
                      }}
                      className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors z-10"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>

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
                      <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4">
                        {dailyTip.overview}
                      </p>
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
            ) : currentPage === 'friends' ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full"
            >
              <div className="text-center mb-10">
                <Users className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h2 className="text-4xl font-bold font-display mb-2">Match de Sofá</h2>
                <p className="text-gray-400">Selecione quem vai assistir com você para encontrarmos o filme perfeito para o grupo.</p>
              </div>

              {user && <Stories userId={user.id} />}

              {/* Friend Requests */}
              {friendRequests.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                    Solicitações Pendentes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendRequests.map(request => (
                      <div key={request.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 border-purple-500/30 bg-purple-500/5">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{request.profiles.username || 'Usuário'}</h4>
                          <p className="text-xs text-gray-400">Quer ser seu amigo</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRespondRequest(request.id, 'accepted')}
                            className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleRespondRequest(request.id, 'declined')}
                            className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {friends.length === 0 ? (
                  <div className="md:col-span-2 py-12 text-center glass-card rounded-2xl border-dashed border-white/10">
                    <p className="text-gray-500 mb-4">Você ainda não tem amigos adicionados.</p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <div 
                      key={friend.id}
                      onClick={() => {
                        if (selectedFriends.includes(friend.id)) {
                          setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                        } else {
                          setSelectedFriends([...selectedFriends, friend.id]);
                        }
                      }}
                      className={`glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${selectedFriends.includes(friend.id) ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{friend.username || 'Amigo'}</h4>
                        <p className="text-xs text-gray-400">Amigo</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedFriends.includes(friend.id) ? 'border-purple-500 bg-purple-500' : 'border-gray-500'}`}>
                        {selectedFriends.includes(friend.id) && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  ))
                )}
                
                <button 
                  onClick={() => setShowAddFriendModal(true)}
                  className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer border-dashed border-white/20 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">Adicionar Amigo</span>
                </button>
              </div>

              <div className="glass-card p-8 rounded-[2rem] text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
                <h3 className="text-2xl font-bold mb-2 font-display">Resolver Conflito</h3>
                <p className="text-gray-400 text-sm mb-6">
                  A IA vai analisar o gosto de todos os selecionados e encontrar o filme perfeito que vai agradar todo mundo.
                </p>
                <button
                  onClick={handleGroupExportForAI}
                  disabled={selectedFriends.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-full hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  Gerar Acordo de Paz (Prompt)
                </button>
              </div>
            </motion.div>
            ) : currentPage === 'library' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-display mb-3">Sua Biblioteca</h2>
                  <p className="text-lg text-gray-400">Gerencie seus filmes avaliados e sua lista de interesses.</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    <span>{ratings.filter(r => r.rating === 'loved').length}</span>
                  </div>
                  <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span>{ratings.filter(r => r.rating === 'liked').length}</span>
                  </div>
                  <div className="px-4 py-2 glass-card rounded-full text-sm font-medium flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-blue-400 fill-blue-400" />
                    <span>{watchlist.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 mb-8 border-b border-white/10 pb-4 overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setLibraryTab('rated')}
                  className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'rated' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Avaliados
                  {libraryTab === 'rated' && (
                    <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
                <button
                  onClick={() => setLibraryTab('watchlist')}
                  className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'watchlist' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Ver Depois
                  {libraryTab === 'watchlist' && (
                    <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
                <button
                  onClick={() => setLibraryTab('skipped')}
                  className={`text-lg font-medium transition-colors relative whitespace-nowrap ${libraryTab === 'skipped' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Pulados
                  {libraryTab === 'skipped' && (
                    <motion.div layoutId="lib-tab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              </div>

              {libraryTab === 'rated' && (
                ratings.filter(r => r.rating === 'loved' || r.rating === 'liked').length === 0 ? (
                  <div className="text-center py-32 glass-card rounded-[2rem]">
                    <Library className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-3 font-display">Sua biblioteca está vazia</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Comece a avaliar filmes no feed para construir sua coleção pessoal.</p>
                    <button 
                      onClick={() => setCurrentPage('feed')}
                      className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
                    >
                      Descobrir Filmes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {ratings.filter(r => r.rating === 'loved' || r.rating === 'liked').map(rating => {
                      const movie = rating.movie || movies.find(m => m.id === rating.movieId);
                      if (!movie) return null;
                      return (
                        <motion.div 
                          key={movie.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                          onClick={() => setEditingMovie(movie)}
                        >
                          <div className="aspect-[2/3] relative">
                            <img 
                              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                              alt={movie.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                            
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
                              {getRatingIcon(rating.rating, "w-4 h-4")}
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                              <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                                <Star className="w-3 h-3 text-amber-400" />
                                <span>{movie.vote_average.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}
              
              {libraryTab === 'watchlist' && (
                watchlist.length === 0 ? (
                  <div className="text-center py-32 glass-card rounded-[2rem]">
                    <Bookmark className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-3 font-display">Sua lista está vazia</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Adicione filmes que você quer ver depois enquanto navega pelo feed.</p>
                    <button 
                      onClick={() => setCurrentPage('feed')}
                      className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
                    >
                      Descobrir Filmes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {watchlist.map(item => {
                      const movie = item.movie || movies.find(m => m.id === item.movieId);
                      if (!movie) return null;
                      return (
                        <motion.div 
                          key={movie.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                          onClick={() => setEditingMovie(movie)}
                        >
                          <div className="aspect-[2/3] relative">
                            <img 
                              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                              alt={movie.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                            
                            <button 
                              onClick={(e) => removeFromWatchlist(movie.id, e)}
                              className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                              <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                                <Star className="w-3 h-3 text-amber-400" />
                                <span>{movie.vote_average.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}

              {libraryTab === 'skipped' && (
                ratings.filter(r => r.rating === 'disliked' || r.rating === 'not_seen').length === 0 ? (
                  <div className="text-center py-32 glass-card rounded-[2rem]">
                    <EyeOff className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-3 font-display">Nenhum filme pulado</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Os filmes que você pular ou não gostar aparecerão aqui.</p>
                    <button 
                      onClick={() => setCurrentPage('feed')}
                      className="bg-white text-black px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
                    >
                      Descobrir Filmes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {ratings.filter(r => r.rating === 'disliked' || r.rating === 'not_seen').map(rating => {
                      const movie = rating.movie || movies.find(m => m.id === rating.movieId);
                      if (!movie) return null;
                      return (
                        <motion.div 
                          key={movie.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-2 cursor-pointer"
                          onClick={() => setEditingMovie(movie)}
                        >
                          <div className="aspect-[2/3] relative">
                            <img 
                              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                              alt={movie.title} 
                              className="w-full h-full object-cover opacity-50 grayscale" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                            
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
                              {getRatingIcon(rating.rating, "w-4 h-4")}
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                              <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                                <Star className="w-3 h-3 text-amber-400" />
                                <span>{movie.vote_average.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}
            </motion.div>
            ) : currentPage === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full"
            >
              <div className="text-center mb-12">
                <div className="w-32 h-32 mx-auto rounded-full glass-card flex items-center justify-center mb-6 border-2 border-purple-500/30 relative">
                  <User className="w-12 h-12 text-gray-400" />
                  <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                    PRO
                  </div>
                </div>
                
                {user ? (
                  <>
                    <h2 className="text-4xl font-bold tracking-tight font-display mb-2">Cinéfilo</h2>
                    <p className="text-gray-400 mb-6">{user.email}</p>
                    
                    {/* Level Progress */}
                    <div className="max-w-md mx-auto mb-8 relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-amber-500 rounded-[2rem] opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
                      <div className="relative glass-card p-6 rounded-3xl border border-white/10 bg-[#111]">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${LEVELS.find(l => l.level === userProfile.level)?.color || 'from-gray-500 to-gray-400'} flex items-center justify-center text-3xl shadow-lg border border-white/10`}>
                              {LEVELS.find(l => l.level === userProfile.level)?.icon || '🌱'}
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Nível {userProfile.level}</p>
                              <p className="font-bold text-xl text-white">{LEVELS.find(l => l.level === userProfile.level)?.name || 'Novato'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{userProfile.xp} <span className="text-sm text-gray-400 font-sans font-normal">XP</span></p>
                          </div>
                        </div>
                        
                        {userProfile.level < 10 && (
                          <>
                            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-2">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${((userProfile.xp - (LEVELS.find(l => l.level === userProfile.level)?.xpRequired || 0)) / ((LEVELS.find(l => l.level === userProfile.level + 1)?.xpRequired || 1) - (LEVELS.find(l => l.level === userProfile.level)?.xpRequired || 0))) * 100}%` }}
                                className={`h-full bg-gradient-to-r ${LEVELS.find(l => l.level === userProfile.level + 1)?.color || 'from-purple-500 to-pink-500'}`}
                              />
                            </div>
                            <p className="text-xs text-gray-400 text-right">
                              Faltam {LEVELS.find(l => l.level === userProfile.level + 1)?.xpRequired! - userProfile.xp} XP para o nível {userProfile.level + 1}
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
                              checked={notificationPrefs[pref.key as keyof typeof notificationPrefs]}
                              onChange={(e) => handleUpdatePreference(pref.key, e.target.checked)}
                              className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                            />
                            {pref.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        await supabaseService.signOut();
                        setUser(null);
                        setUserProfile({ xp: 0, level: 1 });
                        setRatings([]);
                        setWatchlist([]);
                        setSelectedGenres([]);
                        setSelectedFriends([]);
                        setCurrentPage('onboarding');
                        toast.success('Deslogado com sucesso!');
                      }}
                      className="bg-white/10 text-white font-bold py-2 px-6 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center gap-2 mx-auto border border-white/10"
                    >
                      Sair da conta
                    </button>
                  </>
                ) : (
                  <div className="max-w-md mx-auto w-full glass-card p-8 rounded-[2rem] border border-white/10 text-left">
                    <h2 className="text-3xl font-bold font-display mb-2 text-center">
                      {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
                    </h2>
                    <p className="text-gray-400 text-center mb-8">
                      {isSignUp ? 'Cadastre-se para salvar seus filmes' : 'Entre para acessar sua biblioteca'}
                    </p>

                    <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                      {isSignUp && (
                        <div>
                          <input
                            type="text"
                            placeholder="Seu nome de usuário"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            required
                          />
                        </div>
                      )}
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
                        {isAuthLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
                      </button>
                    </form>

                    <div className="text-center mb-6">
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
                      </button>
                    </div>

                    <div className="relative flex items-center py-4">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">ou</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => toast.info('Login com Google estará disponível em breve!', { icon: '⏳' })}
                      className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <User className="w-5 h-5" />
                      Entrar com Google
                    </button>
                  </div>
                )}
              </div>

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
                  <h3 className="text-2xl font-bold text-white mb-2 font-display mt-3">Ficção</h3>
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
                      onClick={() => setCurrentPage('onboarding')}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-white/30 text-gray-400 hover:text-white hover:border-white/60 transition-colors"
                    >
                      + Editar
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
                  <Bot className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 font-display">Consultor de IA</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Exporte seu histórico de filmes e peça recomendações personalizadas para o ChatGPT, Claude ou Gemini.
                  </p>
                  <button
                    onClick={handleExportForAI}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Gerar Prompt para IA
                  </button>
                </div>
              </div>
            </motion.div>
            ) : null}
        </AnimatePresence>
        )}
      </main>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAddFriendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a2e] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <UserPlus className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display">Adicionar Amigo</h3>
                  <p className="text-gray-400 text-sm">Busque por nome de usuário ou e-mail</p>
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  onClick={handleSearchUsers}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
                <input
                  type="text"
                  placeholder="Ex: joaosilva ou joao@email.com"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isSearchingUsers ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                  </div>
                ) : userSearchResults.length > 0 ? (
                  userSearchResults.map(result => (
                    <div key={result.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{result.username || 'Usuário'}</p>
                        <p className="text-xs text-gray-500 truncate">{result.email || ''}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(result.id)}
                        className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : searchUserQuery.length > 2 ? (
                  <p className="text-center text-gray-500 py-4">Nenhum usuário encontrado.</p>
                ) : (
                  <p className="text-center text-gray-500 py-4">Digite pelo menos 3 caracteres.</p>
                )}
              </div>

              <button 
                onClick={() => setShowAddFriendModal(false)}
                className="w-full mt-8 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      {currentPage !== 'onboarding' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 pb-safe z-50">
          <div className="flex justify-around items-center h-20 px-4">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`relative flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute top-0 w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    />
                  )}
                  <Icon className={`w-6 h-6 ${isActive ? 'text-purple-400' : ''}`} />
                  <span className="text-[11px] font-medium tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile-friendly Edit Rating Modal */}
      <AnimatePresence>
        {editingMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setEditingMovie(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
              
              <button 
                onClick={() => handleShare(editingMovie)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 z-20"
                title="Compartilhar"
              >
                <Share2 className="w-5 h-5 text-gray-300" />
              </button>

              <div className="flex items-start gap-4 mb-6 relative z-10 mt-2">
                <img 
                  src={`https://image.tmdb.org/t/p/w200${editingMovie.poster_path}`} 
                  alt={editingMovie.title} 
                  className="w-20 h-30 object-cover rounded-lg shadow-lg" 
                />
                <div>
                  <h3 className="font-bold text-xl text-white leading-tight mb-1">{editingMovie.title}</h3>
                  <p className="text-sm text-gray-400">Alterar avaliação</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-6 relative z-10">
                <button onClick={() => saveRating(editingMovie, 'loved')} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${getRating(editingMovie.id) === 'loved' ? 'bg-pink-500/40 text-pink-300' : 'bg-white/5 hover:bg-pink-500/20 text-pink-500 border border-white/10'}`}>
                  <Heart className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Amei</span>
                </button>
                <button onClick={() => saveRating(editingMovie, 'liked')} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${getRating(editingMovie.id) === 'liked' ? 'bg-emerald-500/40 text-emerald-300' : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-500 border border-white/10'}`}>
                  <ThumbsUp className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Gostei</span>
                </button>
                <button onClick={() => saveRating(editingMovie, 'disliked')} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${getRating(editingMovie.id) === 'disliked' ? 'bg-red-500/40 text-red-300' : 'bg-white/5 hover:bg-red-500/20 text-red-500 border border-white/10'}`}>
                  <ThumbsDown className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Não Gostei</span>
                </button>
                <button onClick={() => addToWatchlist(editingMovie)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${watchlist.some(w => w.movieId === editingMovie.id) ? 'bg-blue-500/40 text-blue-300' : 'bg-white/5 hover:bg-blue-500/20 text-blue-500 border border-white/10'}`}>
                  <Bookmark className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Ver Depois</span>
                </button>
              </div>

              <div className="flex flex-col gap-2 relative z-10">
                {watchlist.some(w => w.movieId === editingMovie.id) && (
                  <button 
                    onClick={() => {
                      removeFromWatchlist(editingMovie.id);
                      setEditingMovie(null);
                    }} 
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Remover da Lista
                  </button>
                )}
                
                {getRating(editingMovie.id) && (
                  <button 
                    onClick={async () => {
                      const newRatings = ratings.filter(r => r.movieId !== editingMovie.id);
                      if (user) {
                        await supabaseService.removeRating(user.id, editingMovie.id);
                      }
                      setRatings(newRatings);
                      toast('Filme removido da biblioteca');
                      setEditingMovie(null);
                    }} 
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Remover da Biblioteca
                  </button>
                )}
                
                <button 
                  onClick={() => setEditingMovie(null)} 
                  className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Rating Animation */}
      <AnimatePresence>
        {ratingAnimation && (
          <motion.div
            key={ratingAnimation.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            {ratingAnimation.type === 'loved' && <Heart className="w-40 h-40 text-pink-500 fill-pink-500 drop-shadow-[0_0_50px_rgba(236,72,153,0.8)]" />}
            {ratingAnimation.type === 'liked' && <ThumbsUp className="w-40 h-40 text-emerald-500 fill-emerald-500 drop-shadow-[0_0_50px_rgba(16,185,129,0.8)]" />}
            {ratingAnimation.type === 'disliked' && <ThumbsDown className="w-40 h-40 text-red-500 fill-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.8)]" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export AI Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-blue-500/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
              
              <button 
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 z-20"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>

              <div className="text-center relative z-10">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  <Check className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4 font-display">Prompt Copiado!</h3>
                
                <div className="text-gray-300 space-y-4 text-sm text-left bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p>
                    O seu histórico de filmes e as instruções já foram copiados para a sua área de transferência.
                  </p>
                  <p className="font-medium text-white">Como usar:</p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>Abra o seu assistente de IA favorito (ChatGPT, Claude, Gemini, etc).</li>
                    <li>Cole o texto que acabou de ser copiado.</li>
                    <li>Envie a mensagem e aguarde as suas 5 recomendações personalizadas!</li>
                  </ol>
                </div>

                <button 
                  onClick={() => setShowExportModal(false)} 
                  className="w-full mt-6 py-4 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
