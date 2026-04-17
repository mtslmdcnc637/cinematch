/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
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

  // Track whether the user explicitly requested sign-out, so we can
  // distinguish user-initiated SIGNED_OUT from SDK-triggered ones
  // (e.g. refresh-token rotation failure) that may be spurious.
  const userInitiatedSignOut = useRef(false);

  useEffect(() => {
    if (!supabase) return;

    // Use getSession() as the source of truth for the initial auth state.
    // The INITIAL_SESSION event from onAuthStateChange is intentionally
    // ignored because it can fire with an expired access_token before the
    // internal token-refresh completes.
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
        userInitiatedSignOut.current = false;
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        // If the user explicitly signed out, clear immediately.
        if (userInitiatedSignOut.current) {
          setUser(null);
          userInitiatedSignOut.current = false;
          return;
        }

        // SDK-triggered SIGNED_OUT — verify the session is truly gone
        // before accepting it.  A spurious SIGNED_OUT can fire when a
        // concurrent refreshSession() call causes a refresh-token
        // rotation conflict; getSession() will still return a valid
        // session in that case.
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            // Session still exists — ignore the spurious SIGNED_OUT
            setUser(currentSession.user);
          } else {
            // Session is truly gone
            setUser(null);
          }
        }).catch(() => {
          setUser(null);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Translate cryptic network errors into user-friendly Portuguese messages.
   * The Supabase SDK surfaces the browser's native TypeError message
   * ("Failed to fetch") when a request can't reach the server at all.
   */
  const sanitizeAuthError = (error: unknown): string => {
    if (!(error instanceof Error)) return 'Erro na autenticação. Tente novamente.';
    const msg = error.message;
    if (msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.' || msg === 'Network request failed') {
      return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
    }
    if (msg.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    }
    if (msg.includes('Too many requests') || msg.includes('rate limit')) {
      return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    }
    return msg || 'Erro na autenticação. Tente novamente.';
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const maxRetries = 2;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        if (isSignUp) {
          await supabaseService.signUpWithEmail(authEmail, authPassword, authUsername);
          toast.success('Conta criada! Verifique seu e-mail ou faça login.', { icon: '🎉' });
          setIsSignUp(false);
        } else {
          await supabaseService.signInWithEmail(authEmail, authPassword);
          toast.success('Login realizado com sucesso!', { icon: '👋' });
        }
        break; // success — exit loop
      } catch (error: unknown) {
        const isNetworkError = error instanceof Error &&
          (error.message === 'Failed to fetch' ||
           error.message === 'NetworkError when attempting to fetch resource.' ||
           error.message === 'Network request failed');

        if (isNetworkError && attempt < maxRetries) {
          attempt++;
          // Exponential backoff: 1s, 2s
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        toast.error(sanitizeAuthError(error));
        break;
      } finally {
        if (attempt >= maxRetries || /* success */ true) {
          setIsAuthLoading(false);
        }
      }
    }
    setIsAuthLoading(false);
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
      userInitiatedSignOut.current = true;
      await supabaseService.signOut();
      setUser(null);
      toast.success('Deslogado com sucesso!');
    } catch {
      userInitiatedSignOut.current = false;
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
