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

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        if (
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('Invalid Refresh Token')
        ) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setIsInitialLoading(false);
          return;
        }
      }

      // If we have a session, try to refresh it to make sure it's valid
      if (session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          // Session is expired and can't be refreshed — sign out
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setIsInitialLoading(false);
          return;
        }
        setUser(refreshData.session.user);
      } else {
        setUser(null);
      }
      setIsInitialLoading(false);
    }).catch(() => {
      setUser(null);
      setIsInitialLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsInitialLoading(false);
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
