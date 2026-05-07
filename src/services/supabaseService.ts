import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/edgeFunction';
import { Movie, Rating, type OracleResult } from '../types';
import { getLevelForXP } from '../constants';

export const supabaseService = {
  // Auth
  signUpWithEmail: async (email: string, password: string, username: string) => {
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: username,
          xp: 0,
          level: 1
        });
      if (profileError) console.error('Failed to create profile:', profileError);
    }

    return data;
  },

  signInWithEmail: async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signInWithGoogle: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  // Database Operations
  saveRating: async (userId: string, movie: Movie, rating: Rating) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: userId,
        movie_id: movie.id,
        rating: rating,
        movie_data: movie,
        timestamp: new Date().toISOString()
      }, { onConflict: 'user_id, movie_id' });
    if (error) throw error;
  },

  removeRating: async (userId: string, movieId: number) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);
    if (error) throw error;
  },

  getRatings: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ratings')
      .select('movie_id, rating, movie_data, timestamp')
      .eq('user_id', userId);
    if (error) throw error;
    return data.map(r => ({
      movieId: r.movie_id,
      rating: r.rating as Rating,
      movie: r.movie_data as Movie,
      timestamp: new Date(r.timestamp).getTime()
    }));
  },

  addToWatchlist: async (userId: string, movie: Movie) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('watchlist')
      .upsert({
        user_id: userId,
        movie_id: movie.id,
        movie_data: movie,
        timestamp: new Date().toISOString()
      }, { onConflict: 'user_id, movie_id' });
    if (error) throw error;
  },

  removeFromWatchlist: async (userId: string, movieId: number) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .match({ user_id: userId, movie_id: movieId });
    if (error) throw error;
  },

  getWatchlist: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('watchlist')
      .select('movie_id, movie_data, timestamp')
      .eq('user_id', userId);
    if (error) throw error;
    return data.map(w => ({
      movieId: w.movie_id,
      movie: w.movie_data as Movie,
      timestamp: new Date(w.timestamp).getTime()
    }));
  },

  // Profile & XP
  getProfile: async (userId: string) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, xp, level, selected_genres, email, subscription_status, subscription_plan')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Gamification v2: Auto-fix level if it doesn't match XP
      // (Users from the old 10-level system may have wrong level values)
      const correctLevel = getLevelForXP(data.xp);
      if (data.level !== correctLevel) {
        // Silently fix the level in the background
        void supabase
          .from('profiles')
          .update({ level: correctLevel })
          .eq('id', userId);
        data.level = correctLevel;
      }

      return {
        ...data,
        selectedGenres: data.selected_genres || []
      };
    } catch (e) {
      throw e;
    }
  },

  updateProfile: async (userId: string, updates: { xp?: number, level?: number, selectedGenres?: number[], username?: string, avatar_url?: string, email?: string }) => {
    if (!supabase) return;
    try {
      // Build update object with only the provided fields
      const updateData: Record<string, unknown> = {};
      if (updates.xp !== undefined) updateData.xp = updates.xp;
      if (updates.level !== undefined) updateData.level = updates.level;
      if (updates.selectedGenres !== undefined) updateData.selected_genres = updates.selectedGenres;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
      if (updates.email !== undefined) updateData.email = updates.email;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      if (error) throw error;
    } catch (e) {
      throw e;
    }
  },

  updateXp: async (userId: string, newXp: number, newLevel: number) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('id', userId);
    if (error) throw error;
  },

  // Friends
  searchUsers: async (query: string) => {
    if (!supabase) return [];
    // SECURITY: Escape % and _ wildcards to prevent information disclosure
    const sanitized = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const { data, error } = await supabase
      .from('profiles')
      // SECURITY: Only return non-sensitive fields (removed email to prevent LGPD violation)
      .select('id, username, avatar_url')
      .or(`username.ilike.%${sanitized}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },

  sendFriendRequest: async (userId: string, friendId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      });
    if (error) throw error;
  },

  getFriendRequests: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        user_id,
        profiles:profiles!friends_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data;
  },

  // SECURITY: require userId to ensure only the intended recipient can respond
  respondToFriendRequest: async (requestId: string, status: 'accepted' | 'declined', userId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', requestId)
      .eq('friend_id', userId); // Only the recipient can respond
    if (error) throw error;
  },

  getFriends: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        user_id,
        friend_id,
        user:profiles!friends_user_id_fkey (id, username, avatar_url),
        friend:profiles!friends_friend_id_fkey (id, username, avatar_url)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    return data.map(f => {
      const isUser = f.user_id === userId;
      const profile = isUser ? f.friend : f.user;
      return Array.isArray(profile) ? profile[0] : profile;
    });
  },

  // Notifications & Preferences
  getNotificationPreferences: async (userId: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('notify_loved, notify_liked, notify_disliked, notify_skipped, notify_watchlist')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  updateNotificationPreferences: async (userId: string, prefs: Record<string, boolean>) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update(prefs)
      .eq('id', userId);
    if (error) throw error;
  },

  getNotifications: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*, sender:profiles!notifications_sender_id_fkey(username)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  markNotificationAsRead: async (userId: string, notificationId: string) => {
    if (!supabase) return;
    // SECURITY: Always include user_id filter to prevent marking other users' notifications
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  createNotification: async (notification: Record<string, unknown>) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('notifications')
      .insert(notification);
    if (error) throw error;
  },

  getDailyTip: async (userId: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('daily_tip_id, daily_tip_date')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  saveDailyTip: async (userId: string, movieId: number) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        daily_tip_id: movieId,
        daily_tip_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', userId);
    if (error) throw error;
  },

  // Oracle AI (via Edge Function)
  // Token refresh is handled internally by invokeEdgeFunction (getFreshToken + retry on 401).
  // We intentionally do NOT call refreshSession() here to avoid refresh-token rotation
  // conflicts when invokeEdgeFunction also tries to refresh.
  askOracle: async (prompt: string) => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const data = await invokeEdgeFunction<{ result: OracleResult }>('oracle', { prompt });
    return data.result;
  },

  getFriendTastes: async (friendId: string) => {
    if (!supabase) return null;
    const [ratings, watchlist] = await Promise.all([
      supabaseService.getRatings(friendId),
      supabaseService.getWatchlist(friendId)
    ]);
    return { ratings, watchlist };
  },

  getRecentFriendRatings: async (userId: string) => {
    if (!supabase) return [];
    const friends = await supabaseService.getFriends(userId);
    const friendIds = friends.map(f => f.id);
    if (friendIds.length === 0) return [];

    const { data, error } = await supabase
      .from('ratings')
      .select('user_id, movie_id, movie_data, timestamp, profiles(username)')
      .in('user_id', friendIds)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  },

  notifyFriends: async (userId: string, senderName: string, movieTitle: string, rating: Rating) => {
    if (!supabase) return;
    const friends = await supabaseService.getFriends(userId);
    for (const friend of friends) {
      const prefs = await supabaseService.getNotificationPreferences(friend.id);
      if (!prefs) continue;

      let shouldNotify = false;
      if (rating === 'loved' && prefs.notify_loved) shouldNotify = true;
      if (rating === 'liked' && prefs.notify_liked) shouldNotify = true;

      if (shouldNotify) {
        await supabaseService.createNotification({
          user_id: friend.id,
          sender_id: userId,
          message: `${senderName} ${rating === 'loved' ? 'amou' : 'curtiu'} o filme ${movieTitle}`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  },

  // Stripe integration
  // Token refresh is handled internally by invokeEdgeFunction.
  // getSession() is safe to call without refresh — user identity (id, email)
  // is stable even when the access_token is expired; invokeEdgeFunction will
  // attach a fresh JWT via the Authorization header.
  createCheckoutSession: async (planId: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const data = await invokeEdgeFunction('stripe-checkout', {
      plan_id: planId,
      user_id: session.user.id,
      user_email: session.user.email,
    });
    return data;
  },

  createPortalSession: async () => {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const data = await invokeEdgeFunction('stripe-portal', {
      user_id: session.user.id,
      return_url: `${window.location.origin}/pricing`,
    });
    return data;
  },

  // LGPD Consent
  getConsents: async (userId: string) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  saveConsents: async (userId: string, consents: Array<{ consent_type: string; granted: boolean }>) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('user_consents')
      .upsert(
        consents.map(c => ({
          user_id: userId,
          consent_type: c.consent_type,
          granted: c.granted,
          granted_at: c.granted ? new Date().toISOString() : undefined,
          revoked_at: !c.granted ? new Date().toISOString() : undefined,
        })),
        { onConflict: 'user_id, consent_type' }
      );
    if (error) throw error;
  },

  revokeConsent: async (userId: string, consentType: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('user_consents')
      .update({ granted: false, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('consent_type', consentType);
    if (error) throw error;
  },

  // Public Profile
  getPublicProfile: async (username: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('username', username)
      .eq('is_public', true)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  updatePublicProfile: async (userId: string, updates: { is_public?: boolean; bio?: string; username?: string }) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('public_profiles')
      .upsert({
        id: userId,
        ...updates,
      }, { onConflict: 'id' });
    if (error) throw error;
  },

  createPublicProfile: async (userId: string, username: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('public_profiles')
      .upsert({
        id: userId,
        username,
        is_public: true,
        bio: '',
      }, { onConflict: 'id' });
    if (error) throw error;
  },

  // Avatar Upload
  uploadAvatar: async (userId: string, file: File): Promise<string | null> => {
    if (!supabase) return null;
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update profile
    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);
    
    return publicUrl;
  },
};
