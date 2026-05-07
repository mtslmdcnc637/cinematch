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
  // (e.g. refresh-token rotation failure).
  const userInitiatedSignOut = useRef(false);
  // Track whether we already showed the session expired toast to avoid duplicates
  const sessionExpiredToastShown = useRef(false);

  useEffect(() => {
    if (!supabase) return;

    // Use getSession() as the source of truth for the initial auth state.
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
      // Ignore INITIAL_SESSION — getSession() already handles the initial state
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        userInitiatedSignOut.current = false;
        sessionExpiredToastShown.current = false;
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        // If the user explicitly signed out, clear immediately
        if (userInitiatedSignOut.current) {
          setUser(null);
          userInitiatedSignOut.current = false;
          return;
        }

        // SDK-triggered SIGNED_OUT — this typically happens when:
        // 1. The refresh token is invalid/expired (session truly gone)
        // 2. A spurious event from concurrent refresh calls (rare)
        //
        // We now handle this by checking if we can still get a valid session.
        // getSession() returns locally cached data, so we also try to actually
        // refresh the token to verify the session is truly invalid.
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
          if (!currentSession) {
            // No cached session at all — truly signed out
            setUser(null);
            if (!sessionExpiredToastShown.current) {
              sessionExpiredToastShown.current = true;
              toast.error('Sessão expirada. Faça login novamente.', { duration: 5000 });
            }
            return;
          }

          // We have a cached session, but the SDK said SIGNED_OUT.
          // This could be a spurious event OR the refresh token could be invalid
          // while the access token is still within its 1-hour validity.
          // Try to refresh the token to verify.
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              // Refresh failed — session is truly invalid
              // Clear everything
              await supabase.auth.signOut();
              setUser(null);
              if (!sessionExpiredToastShown.current) {
                sessionExpiredToastShown.current = true;
                toast.error('Sessão expirada. Faça login novamente.', { duration: 5000 });
              }
            } else {
              // Refresh succeeded — this was a spurious SIGNED_OUT, keep the session
              setUser(refreshData.session.user);
            }
          } catch {
            // Refresh threw — session is truly invalid
            try { await supabase.auth.signOut(); } catch {}
            setUser(null);
            if (!sessionExpiredToastShown.current) {
              sessionExpiredToastShown.current = true;
              toast.error('Sessão expirada. Faça login novamente.', { duration: 5000 });
            }
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
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        toast.error(sanitizeAuthError(error));
        break;
      } finally {
        setIsAuthLoading(false);
      }
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
      userInitiatedSignOut.current = true;
      // Clear all local state first
      setUser(null);
      // Sign out from Supabase
      if (supabase) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      // Force clear any persisted session data
      try {
        localStorage.removeItem(`sb-${new URL(supabase?.auth.settings?.url || 'https://ddrxijoetflsyumjoedv.supabase.co').hostname.split('.')[0]}-auth-token`);
      } catch {}
      // Clear all supabase auth keys from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      // Clear sessionStorage too
      sessionStorage.clear();
      toast.success('Deslogado com sucesso!');
    } catch {
      // Even if signOut fails, clear the local state
      userInitiatedSignOut.current = true;
      setUser(null);
      // Force clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Deslogado com sucesso!');
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

