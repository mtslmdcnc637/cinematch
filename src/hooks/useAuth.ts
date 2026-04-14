/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  isAuthLoading: boolean;
  isInitialLoading: boolean;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authUsername: string;
  setAuthUsername: (username: string) => void;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  handleEmailAuth: (e: FormEvent) => Promise<void>;
  handleGoogleAuth: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    // Use getSession() as the source of truth for the initial auth state.
    // The INITIAL_SESSION event from onAuthStateChange is intentionally
    // ignored because it can fire with an expired access_token before the
    // internal token-refresh completes. When the refresh then fails,
    // SIGNED_OUT fires and the user is abruptly logged out — causing the
    // "token disappears after seconds" bug.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsInitialLoading(false);
    }).catch(() => {
      setUser(null);
      setIsInitialLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore INITIAL_SESSION — getSession() already handles the initial
      // state and avoids the race condition described above.
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (isSignUp) {
        await supabaseService.signUpWithEmail(authEmail, authPassword, authUsername);
        toast.success('Conta criada! Verifique seu e-mail ou faça login.', { icon: '🎉' });
        setIsSignUp(false);
      } else {
        await supabaseService.signInWithEmail(authEmail, authPassword);
        toast.success('Login realizado com sucesso!', { icon: '👋' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro na autenticação';
      toast.error(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await supabaseService.signInWithGoogle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro no login com Google';
      toast.error(message);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseService.signOut();
      setUser(null);
      toast.success('Deslogado com sucesso!');
    } catch {
      toast.error('Erro ao sair da conta');
    }
  };

  return {
    user,
    isAuthLoading,
    isInitialLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authUsername,
    setAuthUsername,
    isSignUp,
    setIsSignUp,
    handleEmailAuth,
    handleGoogleAuth,
    handleSignOut,
  };
}
