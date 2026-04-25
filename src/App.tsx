/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Library, Lightbulb, Search, Users, User } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from './contexts/SubscriptionContext';
import { useAuth } from './hooks/useAuth';
import { useMovies } from './hooks/useMovies';
import { useRatings } from './hooks/useRatings';
import { useFriends } from './hooks/useFriends';
import { useProfile } from './hooks/useProfile';
import { useAnalytics } from './hooks/useAnalytics';
import { useGamification } from './hooks/useGamification';
import { GamificationPanel } from './components/gamification/GamificationPanel';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { LevelUpModal, NotificationsModal, HelpModal } from './components/common/Modals';
import { OnboardingPage } from './components/onboarding/OnboardingPage';
import { FeedPage } from './components/feed/FeedPage';
import { DailyTipPage } from './components/feed/DailyTipPage';
import { SearchPage } from './components/feed/SearchPage';
import { LibraryPage } from './components/library/LibraryPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { FriendsPage } from './components/friends/FriendsPage';
import { OracleModal } from './components/oracle/OracleModal';
import { ConsentModal } from './components/common/ConsentModal';
import { AppInstallBanner } from './components/common/AppInstallBanner';
import { supabase } from './lib/supabase';

const navItems = [
  { id: 'feed', label: 'Descobrir', icon: Sparkles },
  { id: 'daily_tip', label: 'Dica', icon: Lightbulb },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'friends', label: 'Amigos', icon: Users },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'profile', label: 'Perfil', icon: User },
];

export default function App() {
  const navigate = useNavigate();
  const handleNavigateToPricing = useCallback(() => navigate('/pricing'), [navigate]);

  const { isPro, planType, incrementSwipes, incrementDicas } = useSubscription();
  const { trackEvent, trackPageView } = useAnalytics();

  // LGPD Consent state
  const [showConsentModal, setShowConsentModal] = React.useState(false);

  // Auth
  const {
    user, isAuthLoading, isInitialLoading,
    authEmail, setAuthEmail, authPassword, setAuthPassword,
    authUsername, setAuthUsername, isSignUp, setIsSignUp,
    handleEmailAuth, handleGoogleAuth, handleSignOut,
  } = useAuth();

  // Profile
  const {
    userProfile, setUserProfile, currentPage, setCurrentPage,
    onboardingStep, setOnboardingStep, selectedGenres, setSelectedGenres,
    toggleGenre, libraryTab, setLibraryTab,
    showLevelUpModal, setShowLevelUpModal, newLevelData, setNewLevelData,
    showHelpModal, setShowHelpModal, showNotificationsModal, setShowNotificationsModal,
    notifications, notificationPrefs, handleUpdatePreference, handleSaveGenres,
    isInitialLoading: isDataLoading, loadUserData, dataLoadError,
  } = useProfile({
    user,
  });

  // Friends
  const {
    friends, setFriends, friendRequests, setFriendRequests,
    searchUserQuery, setSearchUserQuery, userSearchResults, isSearchingUsers,
    showAddFriendModal, setShowAddFriendModal,
    handleSearchUsers, handleSendRequest, handleRespondRequest,
  } = useFriends({ user, currentPage });

  // Ratings
  const {
    ratings, setRatings, watchlist, setWatchlist,
    editingMovie, setEditingMovie,
    showExportModal, setShowExportModal,
    oracleResult, oracleMovies, isOracleLoading, oracleMode,
    ratingAnimation, selectedFriends, setSelectedFriends,
    saveRating, addToWatchlist, removeFromWatchlist,
    handleShare, handleExportForAI, handleGroupExportForAI,
  } = useRatings({
    user, userProfile, setUserProfile,
    setShowLevelUpModal, setNewLevelData,
    incrementSwipes, isPro,
    onNavigateToPricing: handleNavigateToPricing,
    friends,
  });

  // Gamification stats computed from ratings
  const gamificationStats = React.useMemo(() => {
    const genreCounts: Record<number, number> = {};
    const genreSet = new Set<number>();
    ratings.forEach(r => {
      if (r.movie?.genre_ids) {
        r.movie.genre_ids.forEach(id => {
          genreCounts[id] = (genreCounts[id] || 0) + 1;
          genreSet.add(id);
        });
      }
    });
    const maxGenreCount = Math.max(0, ...Object.values(genreCounts));
    return {
      totalRatings: ratings.length,
      lovedCount: ratings.filter(r => r.rating === 'loved').length,
      genresExplored: genreSet.size,
      maxGenreCount,
      watchlistCount: watchlist.length,
      friendCount: friends.length,
      level: userProfile.level,
    };
  }, [ratings, watchlist, friends, userProfile.level]);

  const {
    streak, streakInfo, achievements, achievementStats,
    challenges, challengeStats, leaderboard, userRank,
    recordActivity, checkAchievements, updateChallengeProgress,
    isLoading: isGamificationLoading,
  } = useGamification({
    user,
    isPro,
    ...gamificationStats,
  });

  // Movies
  const {
    currentMovie, activeGenre, setActiveGenre,
    isLoading, isLoadingMore,
    searchQuery, setSearchQuery, searchResults, isSearching,
    dailyTip, dailyTipReason, dailyTipGenre, setDailyTipGenre,
    isLoadingTip, providers, getProviders,
    generateDailyTip, getRating,
  } = useMovies({
    user, ratings, watchlist, selectedGenres, currentPage,
    incrementDicas,
    onNavigateToPricing: handleNavigateToPricing,
  });

  // Non-logged-in users are handled directly in the render logic below
  // (no useEffect needed — prevents any data loading before redirect)

  // Handle login action from quiz redirect (?action=login)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);

    // If redirected from pricing, send them back there
    const redirect = params.get('redirect');
    if (redirect) {
      window.history.replaceState({}, '', '/login');
      navigate(redirect);
      return;
    }

    if (params.get('action') === 'login') {
      setIsSignUp(false);
      setCurrentPage('profile');
      // Clean the URL — keep /login to stay in App, not QuizApp
      window.history.replaceState({}, '', '/login');
    }
  }, [user]);

  // Load user data when user changes
  useEffect(() => {
    if (!user) return;
    loadUserData(setRatings, setWatchlist);
  }, [user, loadUserData, setRatings, setWatchlist]);

  // Track page views
  useEffect(() => {
    if (currentPage) {
      trackPageView(`/${currentPage}`, `MrCine - ${currentPage}`);
    }
  }, [currentPage, trackPageView]);

  // Check if user needs LGPD consent — only once per session on login
  useEffect(() => {
    if (user && currentPage !== 'onboarding' && supabase) {
      supabase
        .from('user_consents')
        .select('id')
        .eq('user_id', user.id)
        .eq('consent_type', 'terms')
        .eq('granted', true)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) setShowConsentModal(true);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only re-run when user changes (login/logout), NOT on every page change

  const getRatingIcon = (rating: string, className = "w-5 h-5") => {
    switch (rating) {
      case 'loved': return <span className={className}>💖</span>;
      case 'liked': return <span className={className}>👍</span>;
      case 'disliked': return <span className={className}>👎</span>;
      default: return <span className={className}>🙈</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <Toaster theme="dark" position="top-center" className="font-sans" toastOptions={{
        duration: 4000,
        style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
      }} />

      {/* Atmospheric Background */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* Header - only show when user is logged in */}
      {user && (
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          navItems={navItems}
          notifications={notifications}
          setShowNotificationsModal={setShowNotificationsModal}
          setShowHelpModal={setShowHelpModal}
          isPro={isPro}
          userProfile={userProfile}
        />
      )}

      {/* Modals */}
      <ErrorBoundary>
        <LevelUpModal show={showLevelUpModal} levelData={newLevelData} onClose={() => setShowLevelUpModal(false)} />
      </ErrorBoundary>
      <ErrorBoundary>
        <NotificationsModal show={showNotificationsModal} notifications={notifications} onClose={() => setShowNotificationsModal(false)} />
      </ErrorBoundary>
      <ErrorBoundary>
        <HelpModal show={showHelpModal} onClose={() => setShowHelpModal(false)} />
      </ErrorBoundary>
      <ErrorBoundary>
        <OracleModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          result={oracleResult}
          movies={oracleMovies}
          isLoading={isOracleLoading}
          mode={oracleMode}
        />
      </ErrorBoundary>

      {/* LGPD Consent Modal */}
      {user && (
        <ConsentModal
          show={showConsentModal}
          userId={user.id}
          onAccept={() => setShowConsentModal(false)}
        />
      )}

      {/* Data Load Error Banner */}
      {user && dataLoadError && !isDataLoading && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-red-900/80 backdrop-blur-xl border-b border-red-500/30 px-4 py-3 text-center">
          <p className="text-red-200 text-sm">{dataLoadError}</p>
          <button
            onClick={() => { loadUserData(setRatings, setWatchlist); }}
            className="mt-1 text-xs text-red-300 underline hover:text-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

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
        ) : !user ? (
          /* Non-logged-in users see ONLY the login form — no data loading at all */
          <ErrorBoundary>
            <ProfilePage
              userProfile={userProfile}
              ratings={ratings}
              watchlist={watchlist}
              isPro={isPro}
              planType={planType}
              onSignOut={handleSignOut}
              handleExportForAI={handleExportForAI}
              oracleResult={oracleResult}
              oracleMovies={oracleMovies}
              isOracleLoading={isOracleLoading}
              showExportModal={showExportModal}
              setShowExportModal={setShowExportModal}
              notificationPrefs={notificationPrefs as unknown as Record<string, boolean>}
              onUpdatePreference={handleUpdatePreference}
              user={user}
              authEmail={authEmail}
              setAuthEmail={setAuthEmail}
              authPassword={authPassword}
              setAuthPassword={setAuthPassword}
              authUsername={authUsername}
              setAuthUsername={setAuthUsername}
              isSignUp={isSignUp}
              setIsSignUp={setIsSignUp}
              isAuthLoading={isAuthLoading}
              handleEmailAuth={handleEmailAuth}
              handleGoogleAuth={handleGoogleAuth}
              selectedGenres={selectedGenres}
              onEditGenres={() => setCurrentPage('onboarding')}
            />
          </ErrorBoundary>
        ) : (
          <AnimatePresence mode="wait">
            {currentPage === 'onboarding' && (
              <ErrorBoundary>
                <OnboardingPage
                  selectedGenres={selectedGenres}
                  toggleGenre={toggleGenre}
                  onContinue={handleSaveGenres}
                  onLogin={() => {
                    setIsSignUp(false);
                    setCurrentPage('profile');
                  }}
                  user={user}
                  authEmail={authEmail}
                  setAuthEmail={setAuthEmail}
                  authPassword={authPassword}
                  setAuthPassword={setAuthPassword}
                  authUsername={authUsername}
                  setAuthUsername={setAuthUsername}
                  isSignUp={isSignUp}
                  setIsSignUp={setIsSignUp}
                  isAuthLoading={isAuthLoading}
                  handleEmailAuth={handleEmailAuth}
                  handleGoogleAuth={handleGoogleAuth}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'feed' && (
              <ErrorBoundary>
                <FeedPage
                  currentMovie={currentMovie}
                  activeGenre={activeGenre}
                  setActiveGenre={setActiveGenre}
                  saveRating={saveRating}
                  addToWatchlist={addToWatchlist}
                  isLoading={isLoading}
                  isLoadingMore={isLoadingMore}
                  isPro={isPro}
                  providers={providers}
                  getProviders={getProviders}
                  ratingAnimation={ratingAnimation}
                  onShare={handleShare}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'daily_tip' && (
              <ErrorBoundary>
                <DailyTipPage
                  dailyTip={dailyTip}
                  dailyTipReason={dailyTipReason}
                  dailyTipGenre={dailyTipGenre}
                  setDailyTipGenre={setDailyTipGenre}
                  isLoadingTip={isLoadingTip}
                  generateDailyTip={generateDailyTip}
                  isPro={isPro}
                  saveRating={saveRating}
                  addToWatchlist={addToWatchlist}
                  providers={providers}
                  getProviders={getProviders}
                  onShare={handleShare}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'search' && (
              <ErrorBoundary>
                <SearchPage
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  saveRating={saveRating}
                  addToWatchlist={addToWatchlist}
                  getRating={getRating}
                  providers={providers}
                  getProviders={getProviders}
                  getRatingIcon={getRatingIcon}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'library' && (
              <ErrorBoundary>
                <LibraryPage
                  ratings={ratings}
                  watchlist={watchlist}
                  libraryTab={libraryTab}
                  setLibraryTab={setLibraryTab}
                  removeFromWatchlist={removeFromWatchlist}
                  saveRating={saveRating}
                  getRatingIcon={getRatingIcon}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'profile' && (
              <ErrorBoundary>
                <ProfilePage
                  userProfile={userProfile}
                  ratings={ratings}
                  watchlist={watchlist}
                  isPro={isPro}
                  planType={planType}
                  onSignOut={handleSignOut}
                  handleExportForAI={handleExportForAI}
                  oracleResult={oracleResult}
                  oracleMovies={oracleMovies}
                  isOracleLoading={isOracleLoading}
                  showExportModal={showExportModal}
                  setShowExportModal={setShowExportModal}
                  notificationPrefs={notificationPrefs as unknown as Record<string, boolean>}
                  onUpdatePreference={handleUpdatePreference}
                  user={user}
                  authEmail={authEmail}
                  setAuthEmail={setAuthEmail}
                  authPassword={authPassword}
                  setAuthPassword={setAuthPassword}
                  authUsername={authUsername}
                  setAuthUsername={setAuthUsername}
                  isSignUp={isSignUp}
                  setIsSignUp={setIsSignUp}
                  isAuthLoading={isAuthLoading}
                  handleEmailAuth={handleEmailAuth}
                  handleGoogleAuth={handleGoogleAuth}
                  selectedGenres={selectedGenres}
                  onEditGenres={() => setCurrentPage('onboarding')}
                  streak={streak}
                  streakInfo={streakInfo}
                  achievements={achievements}
                  achievementStats={achievementStats}
                  challenges={challenges}
                  challengeStats={challengeStats}
                  leaderboard={leaderboard}
                  userRank={userRank}
                  isGamificationLoading={isGamificationLoading}
                />
              </ErrorBoundary>
            )}

            {currentPage === 'friends' && (
              <ErrorBoundary>
                <FriendsPage
                  userId={user?.id}
                  friends={friends}
                  friendRequests={friendRequests}
                  searchUserQuery={searchUserQuery}
                  setSearchUserQuery={setSearchUserQuery}
                  userSearchResults={userSearchResults}
                  isSearchingUsers={isSearchingUsers}
                  handleSearchUsers={handleSearchUsers}
                  handleSendRequest={handleSendRequest}
                  handleRespondRequest={handleRespondRequest}
                  handleGroupExportForAI={handleGroupExportForAI}
                  showAddFriendModal={showAddFriendModal}
                  setShowAddFriendModal={setShowAddFriendModal}
                  selectedFriends={selectedFriends}
                  setSelectedFriends={(f: string[]) => setSelectedFriends(f)}
                  showExportModal={showExportModal}
                  setShowExportModal={setShowExportModal}
                  isPro={isPro}
                />
              </ErrorBoundary>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* APK Install Banner - only for Pro users */}
      {user && isPro && (
        <AppInstallBanner isPro={isPro} />
      )}

      {/* Mobile Bottom Navigation - only show when user is logged in */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around items-center py-2 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'text-purple-400 bg-purple-500/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
