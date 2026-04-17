/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRating, WatchlistItem } from '../types';
import { toast } from 'sonner';

interface LevelData {
  level: number;
  name: string;
  xpRequired: number;
  icon: string;
  color: string;
}

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  [key: string]: unknown;
}

interface NotificationPrefs {
  notify_loved: boolean;
  notify_liked: boolean;
  notify_disliked: boolean;
  notify_skipped: boolean;
  notify_watchlist: boolean;
}

const defaultPrefs: NotificationPrefs = {
  notify_loved: true,
  notify_liked: false,
  notify_disliked: false,
  notify_skipped: false,
  notify_watchlist: false,
};

interface UseProfileParams {
  user: { id: string; email?: string } | null;
}

interface UseProfileReturn {
  userProfile: UserProfile;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  selectedGenres: number[];
  setSelectedGenres: Dispatch<SetStateAction<number[]>>;
  toggleGenre: (id: number) => void;
  libraryTab: 'rated' | 'watchlist' | 'skipped';
  setLibraryTab: (tab: 'rated' | 'watchlist' | 'skipped') => void;
  showLevelUpModal: boolean;
  setShowLevelUpModal: (show: boolean) => void;
  newLevelData: LevelData | null;
  setNewLevelData: (data: LevelData | null) => void;
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
  showNotificationsModal: boolean;
  setShowNotificationsModal: (show: boolean) => void;
  notifications: Notification[];
  notificationPrefs: NotificationPrefs;
  handleUpdatePreference: (key: string, value: boolean) => Promise<void>;
  handleSaveGenres: () => Promise<void>;
  isInitialLoading: boolean;
  setIsInitialLoading: (loading: boolean) => void;
  dataLoadError: string | null;
  loadUserData: (ratingsSetter: Dispatch<SetStateAction<UserRating[]>>, watchlistSetter: Dispatch<SetStateAction<WatchlistItem[]>>) => void;
}

export function useProfile({ user }: UseProfileParams): UseProfileReturn {
  const [userProfile, setUserProfile] = useState<UserProfile>({ xp: 0, level: 1 });
  const [currentPage, setCurrentPage] = useState('feed');
  // Track whether the initial page has been set after login,
  // to prevent loadUserData from overriding the user's current page.
  const hasSetInitialPageRef = useRef(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [libraryTab, setLibraryTab] = useState<'rated' | 'watchlist' | 'skipped'>('rated');

  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevelData, setNewLevelData] = useState<LevelData | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // ── Notifications query (replaces useEffect) ──────────────────────────
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => supabaseService.getNotifications(user!.id) as Promise<Notification[]>,
    enabled: !!user,
  });

  // ── Notification preferences query (replaces useEffect) ───────────────
  const { data: notificationPrefs = defaultPrefs } = useQuery({
    queryKey: ['notificationPrefs', user?.id],
    queryFn: () => supabaseService.getNotificationPreferences(user!.id) as Promise<NotificationPrefs>,
    enabled: !!user,
  });

  // ── Fetch profile, ratings, and watchlist when user changes ───────────
  const loadUserData = useCallback(
    (
      ratingsSetter: Dispatch<SetStateAction<UserRating[]>>,
      watchlistSetter: Dispatch<SetStateAction<WatchlistItem[]>>
    ) => {
      setDataLoadError(null);

      if (user) {
        supabaseService.getProfile(user.id).then(async (profile) => {
          if (profile) {
            if (!profile.email && user.email) {
              await supabaseService.updateProfile(user.id, { ...profile, email: user.email });
              profile.email = user.email;
            }
            setUserProfile(profile);
            if (profile.selectedGenres && profile.selectedGenres.length >= 3) {
              setSelectedGenres(profile.selectedGenres);
              // User already has genres — ensure they're on feed, not onboarding
              if (!hasSetInitialPageRef.current) {
                setCurrentPage('feed');
                hasSetInitialPageRef.current = true;
              }
            } else {
              // New user without genres — send to onboarding to select genres
              if (!hasSetInitialPageRef.current) {
                setCurrentPage('onboarding');
                hasSetInitialPageRef.current = true;
              }
            }
          } else {
            // No profile exists yet — new user, go to onboarding
            if (!hasSetInitialPageRef.current) {
              setCurrentPage('onboarding');
              hasSetInitialPageRef.current = true;
            }
            setUserProfile({ id: user.id, email: user.email, xp: 0, level: 1 });
          }
          setIsInitialLoading(false);
        }).catch(async (err) => {
          console.error('[loadUserData] getProfile failed:', err);

          // If the error looks like an auth issue, try refreshing the session once
          const errMsg = err instanceof Error ? err.message : String(err);
          if (supabase && (errMsg.includes('401') || errMsg.includes('JWT') || errMsg.includes('auth') || errMsg.includes('token'))) {
            console.log('[loadUserData] Attempting session refresh before retry...');
            try {
              const { data: { session } } = await supabase.auth.refreshSession();
              if (session) {
                console.log('[loadUserData] Session refreshed, retrying getProfile...');
                try {
                  const retryProfile = await supabaseService.getProfile(user.id);
                  if (retryProfile) {
                    setUserProfile(retryProfile);
                    if (retryProfile.selectedGenres && retryProfile.selectedGenres.length >= 3) {
                      setSelectedGenres(retryProfile.selectedGenres);
                      if (!hasSetInitialPageRef.current) {
                        setCurrentPage('feed');
                        hasSetInitialPageRef.current = true;
                      }
                    } else {
                      if (!hasSetInitialPageRef.current) {
                        setCurrentPage('onboarding');
                        hasSetInitialPageRef.current = true;
                      }
                    }
                  } else {
                    setUserProfile({ id: user.id, email: user.email, xp: 0, level: 1 });
                    if (!hasSetInitialPageRef.current) {
                      setCurrentPage('onboarding');
                      hasSetInitialPageRef.current = true;
                    }
                  }
                  setIsInitialLoading(false);
                  return; // Success — don't set error
                } catch (retryErr) {
                  console.error('[loadUserData] Retry after refresh also failed:', retryErr);
                }
              }
            } catch (refreshErr) {
              console.error('[loadUserData] Session refresh failed:', refreshErr);
            }
          }

          setDataLoadError('Erro ao carregar seus dados. Tente novamente ou faça login novamente.');
          setIsInitialLoading(false);
        });

        supabaseService.getRatings(user.id).then(data => {
          if (data && data.length > 0) {
            ratingsSetter(data);
          }
        }).catch((err) => {
          console.error('[loadUserData] getRatings failed:', err);
        });

        supabaseService.getWatchlist(user.id).then(data => {
          if (data && data.length > 0) {
            watchlistSetter(data);
          }
        }).catch((err) => {
          console.error('[loadUserData] getWatchlist failed:', err);
        });
      } else {
        setUserProfile({ xp: 0, level: 1 });
        setIsInitialLoading(false);
      }
    },
    [user]
  );

  const toggleGenre = useCallback((id: number) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }, []);

  // ── Update preference with optimistic update via queryClient ──────────
  const handleUpdatePreference = useCallback(
    async (key: string, value: boolean) => {
      if (!user) return;

      const queryKey = ['notificationPrefs', user.id];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousPrefs = queryClient.getQueryData<NotificationPrefs>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<NotificationPrefs>(queryKey, (old) => ({
        ...(old || defaultPrefs),
        [key]: value,
      }));

      try {
        await supabaseService.updateNotificationPreferences(user.id, { [key]: value });
        toast.success('Preferências salvas!');
      } catch {
        // Rollback to the previous value on error
        if (previousPrefs) {
          queryClient.setQueryData(queryKey, previousPrefs);
        }
      }
    },
    [user, queryClient]
  );

  const handleSaveGenres = useCallback(async () => {
    if (user) {
      try {
        await supabaseService.updateProfile(user.id, { selectedGenres });
        setCurrentPage('feed');
      } catch {
        toast.error('Erro ao salvar gêneros.');
      }
    } else {
      // Non-logged-in user needs to create account first
      setCurrentPage('profile');
    }
  }, [user, selectedGenres]);

  return {
    userProfile,
    setUserProfile,
    currentPage,
    setCurrentPage,
    onboardingStep,
    setOnboardingStep,
    selectedGenres,
    setSelectedGenres,
    toggleGenre,
    libraryTab,
    setLibraryTab,
    showLevelUpModal,
    setShowLevelUpModal,
    newLevelData,
    setNewLevelData,
    showHelpModal,
    setShowHelpModal,
    showNotificationsModal,
    setShowNotificationsModal,
    notifications,
    notificationPrefs,
    handleUpdatePreference,
    handleSaveGenres,
    isInitialLoading,
    setIsInitialLoading,
    dataLoadError,
    loadUserData,
  };
}
