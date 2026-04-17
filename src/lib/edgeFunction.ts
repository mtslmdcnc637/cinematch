/**
 * Utility for calling Supabase Edge Functions with fresh JWTs.
 *
 * Key design decisions:
 * - Always tries `getSession()` first, then falls back to `refreshSession()`
 *   if the token is expired or about to expire (within 5 min buffer).
 * - `getSession()` returns the in-memory session but does NOT auto-refresh.
 *   `autoRefreshToken` in the Supabase client only works for SDK calls
 *   (e.g. `supabase.from('table').select()`), NOT for raw `fetch()` calls.
 *   Since edge functions are called via raw `fetch()`, we must handle
 *   token refresh ourselves aggressively.
 * - Does NOT call `supabase.auth.signOut()` — that is the responsibility
 *   of the auth layer (useAuth), not an HTTP utility.
 * - On 401, retries once after forcing a `refreshSession()`, then tries
 *   `getSession()` one final time in case autoRefreshToken kicked in.
 * - All errors are thrown; callers decide how to handle them.
 *
 * CRITICAL FIX: A refresh mutex prevents concurrent `refreshSession()` calls.
 * Supabase has `refresh_token_rotation_enabled: true`, meaning each refresh
 * invalidates the previous refresh token. Concurrent refreshes cause the
 * second one to fail with "Invalid refresh token". The mutex ensures only
 * one refresh is in-flight at a time.
 *
 * For tmdb-proxy: verify_jwt is disabled server-side, so we send the
 * apikey header only (no Authorization) — this avoids the 401 race
 * condition with the Supabase JWT verifier.
 */

import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Edge functions that have verify_jwt = false and don't need a user JWT.
 * The apikey (anon key) is sufficient for these.
 */
const PUBLIC_FUNCTIONS = new Set(['tmdb-proxy']);

// ── Refresh Mutex ────────────────────────────────────────────────────────────
// Prevents concurrent refreshSession() calls that would cause refresh-token
// rotation conflicts (Supabase invalidates the old refresh token on each use).
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh the session, with mutex protection.
 * If a refresh is already in-flight, the caller waits for it and reuses
 * the result instead of triggering a second refresh.
 */
async function refreshWithMutex(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    console.log('[edgeFunction] Refresh already in-flight, waiting for it...');
    return refreshPromise;
  }

  // Start a new refresh
  refreshPromise = (async () => {
    try {
      console.log('[edgeFunction] Starting refreshSession...');
      const { data, error } = await supabase!.auth.refreshSession();
      if (error || !data.session) {
        console.error('[edgeFunction] refreshSession failed:', error?.message);
        return null;
      }
      console.log('[edgeFunction] refreshSession succeeded');
      return data.session.access_token;
    } finally {
      // Clear the promise after completion so the next call starts fresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Helper: wait for a brief delay (for autoRefreshToken to complete).
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensure we have a valid, non-expired access token.
 *
 * 1. Call getSession() to get the current session.
 * 2. Parse the JWT to check expiry.
 * 3. If expired or about to expire (within 5min buffer), call refreshSession().
 * 4. Uses a mutex to prevent concurrent refresh calls (rotation conflict).
 * 5. Never calls signOut() — just throws if refresh fails.
 */
async function getFreshToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    // No session at all — try refreshing once before giving up
    const token = await refreshWithMutex();
    if (!token) {
      throw new Error('No active session — user must be logged in');
    }
    return token;
  }

  // Check if token is expired or about to expire (within 5 minutes buffer).
  // We use a 5-minute buffer instead of 10 to reduce unnecessary refreshes
  // that could cause rotation conflicts.
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // ms
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt - now < buffer) {
      // Token is expired or about to expire — refresh it via mutex
      console.log('[edgeFunction] Token expiring soon, refreshing...', {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString(),
        remaining: Math.round((expiresAt - now) / 1000) + 's',
      });
      const token = await refreshWithMutex();
      if (!token) {
        throw new Error('Session expired and could not be refreshed');
      }
      return token;
    }
  } catch (e) {
    // If it's our own error, re-throw
    if (e instanceof Error && e.message === 'Session expired and could not be refreshed') throw e;
    // If token parsing fails (malformed JWT), try refreshing via mutex
    console.warn('[edgeFunction] Failed to parse JWT, attempting refresh:', e);
    const token = await refreshWithMutex();
    if (!token) {
      throw new Error('Session expired and could not be refreshed');
    }
    return token;
  }

  return session.access_token;
}

/**
 * Call a Supabase Edge Function.
 *
 * For functions in PUBLIC_FUNCTIONS (e.g. tmdb-proxy), only the apikey
 * header is sent — no JWT. This avoids 401 errors when verify_jwt is
 * disabled server-side.
 *
 * For other functions, a fresh JWT is sent and 401s trigger a retry
 * after refreshSession().
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: unknown,
  retryOn401 = true,
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured');
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  // For public functions (verify_jwt = false), only send apikey
  if (PUBLIC_FUNCTIONS.has(functionName)) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`[HTTP ${response.status}] ${errorData.error || `Edge function error`}`);
    }

    return response.json() as Promise<T>;
  }

  // For protected functions, send JWT
  const accessToken = await getFreshToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${accessToken}`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401 && retryOn401) {
    // Token was rejected — force-refresh via mutex and retry once
    console.log('[edgeFunction] Got 401, attempting refresh+retry...');
    try {
      const freshToken = await refreshWithMutex();
      if (freshToken) {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${freshToken}`,
        };

        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(body),
        });

        if (retryResponse.ok) {
          return retryResponse.json() as Promise<T>;
        }

        // Still failing — wait briefly for autoRefreshToken and try getSession()
        await delay(300);
        const { data: fallbackSession } = await supabase!.auth.getSession();
        if (fallbackSession?.session?.access_token) {
          console.log('[edgeFunction] Using fallback session from autoRefreshToken');
          const fallbackHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${fallbackSession.session.access_token}`,
          };
          const fallbackResponse = await fetch(url, {
            method: 'POST',
            headers: fallbackHeaders,
            body: JSON.stringify(body),
          });
          if (fallbackResponse.ok) {
            return fallbackResponse.json() as Promise<T>;
          }
          const fallbackError = await fallbackResponse.json().catch(() => ({}));
          throw new Error(`[HTTP ${fallbackResponse.status}] ${fallbackError.error || `Edge function error`}`);
        }

        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(`[HTTP ${retryResponse.status}] ${errorData.error || `Edge function error`}`);
      }
    } catch (e) {
      // Refresh failed — re-throw the error but do NOT sign out
      if (e instanceof Error && e.message !== 'Authentication failed — please log in again') throw e;
    }
    // Refresh failed or still 401 after retry — throw but do NOT sign out
    throw new Error('Authentication failed — please log in again');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`[HTTP ${response.status}] ${errorData.error || `Edge function error`}`);
  }

  return response.json() as Promise<T>;
}
