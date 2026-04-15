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

/**
 * Ensure we have a valid, non-expired access token.
 *
 * 1. Call getSession() to get the current session.
 * 2. Parse the JWT to check expiry.
 * 3. If expired or about to expire (within 60s), call refreshSession().
 * 4. Never calls signOut() — just throws if refresh fails.
 */
async function getFreshToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    // No session at all — try refreshing once before giving up
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      throw new Error('No active session — user must be logged in');
    }
    return refreshData.session.access_token;
  }

  // Check if token is expired or about to expire (within 5 minutes buffer).
  // We use a generous buffer because:
  // 1. Edge function calls use raw fetch() — autoRefreshToken doesn't kick in.
  // 2. Clock skew between client and Supabase servers.
  // 3. Network latency before the token reaches the Supabase gateway.
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // ms
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt - now < buffer) {
      // Token is expired or about to expire — refresh it
      console.log('[edgeFunction] Token expiring soon, refreshing...', {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString(),
        remaining: Math.round((expiresAt - now) / 1000) + 's',
      });
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.error('[edgeFunction] Token refresh failed:', refreshError);
        throw new Error('Session expired and could not be refreshed');
      }
      return refreshData.session.access_token;
    }
  } catch (e) {
    // If token parsing fails (malformed JWT), try refreshing
    if (e instanceof Error && e.message === 'Session expired and could not be refreshed') throw e;
    console.warn('[edgeFunction] Failed to parse JWT, attempting refresh:', e);
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      throw new Error('Session expired and could not be refreshed');
    }
    return refreshData.session.access_token;
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
      throw new Error(errorData.error || `Edge function error: ${response.status}`);
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
    // Token was rejected — force-refresh and retry once
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${refreshData.session.access_token}`,
        };

        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(body),
        });

        if (!retryResponse.ok) {
          // Still failing after refresh — one last attempt:
          // autoRefreshToken might have refreshed the session in the
          // background between our refreshSession() and now.
          const { data: lastChanceSession } = await supabase.auth.getSession();
          if (lastChanceSession?.session?.access_token) {
            const lastHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${lastChanceSession.session.access_token}`,
            };
            const lastResponse = await fetch(url, {
              method: 'POST',
              headers: lastHeaders,
              body: JSON.stringify(body),
            });
            if (lastResponse.ok) {
              return lastResponse.json() as Promise<T>;
            }
            const lastErrorData = await lastResponse.json().catch(() => ({}));
            throw new Error(lastErrorData.error || `Edge function error: ${lastResponse.status}`);
          }

          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Edge function error: ${retryResponse.status}`);
        }

        return retryResponse.json() as Promise<T>;
      }
    } catch (e) {
      // Refresh failed — re-throw the error but do NOT sign out
      if (e instanceof Error) throw e;
    }
    // Refresh failed or still 401 after retry — throw but do NOT sign out
    throw new Error('Authentication failed — please log in again');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Edge function error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
