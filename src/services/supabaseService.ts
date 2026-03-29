import { supabase } from '../lib/supabase';
import { Movie, Rating } from '../types';

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
      // Cria ou atualiza o perfil na tabela profiles
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: username,
          xp: 0,
          level: 1
        });
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
        .select('id, username, avatar_url, xp, level, selected_genres, email')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error("Supabase getProfile error:", error);
        throw error;
      }
      return {
        ...data,
        selectedGenres: data.selected_genres || []
      };
    } catch (e) {
      console.error("Exception in getProfile:", e);
      throw e;
    }
  },

  updateProfile: async (userId: string, updates: { xp?: number, level?: number, selectedGenres?: number[], username?: string, avatar_url?: string, email?: string }) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          xp: updates.xp || 0,
          level: updates.level || 1,
          selected_genres: updates.selectedGenres,
          username: updates.username,
          avatar_url: updates.avatar_url,
          email: updates.email
        }, { onConflict: 'id' });
      if (error) {
        console.error("Supabase updateProfile error:", error);
        throw error;
      }
    } catch (e) {
      console.error("Exception in updateProfile:", e);
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, email')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
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

  respondToFriendRequest: async (requestId: string, status: 'accepted' | 'declined') => {
    if (!supabase) return;
    const { error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', requestId);
    if (error) throw error;
  },

  getFriends: async (userId: string) => {
    if (!supabase) return [];
    // Get friends where user is either user_id or friend_id
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
      return isUser ? f.friend : f.user;
    });
  },

  getFriendTastes: async (friendId: string) => {
    if (!supabase) return null;
    const [ratings, watchlist] = await Promise.all([
      supabaseService.getRatings(friendId),
      supabaseService.getWatchlist(friendId)
    ]);
    return { ratings, watchlist };
  }
};
