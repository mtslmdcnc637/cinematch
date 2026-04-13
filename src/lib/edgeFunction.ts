/**
 * Utility for calling Supabase Edge Functions with guaranteed fresh JWTs.
 *
 * Why not use `supabase.functions.invoke()`?
 * The SDK auto-includes the Authorization header from its internal session,
 * but there is a known race condition where the internal session can be stale
 * (expired access_token) even after `refreshSession()` resolves.  By using
 * direct `fetch()` we have full control over the headers and can guarantee
 * the freshest token is sent every time.
 */

import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Ensure we have a valid, non-expired session.  Refreshes proactively if the
 * token is within 60 seconds of expiry.  Returns the fresh access_token or
 * throws if no session / refresh fails.
 */
async function getFreshToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('No active session — user must be logged in');
  }

  // Check if token is expired or about to expire (within 60 seconds)
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // ms
    const now = Date.now();
    const buffer = 60 * 1000; // 60 seconds

    if (expiresAt - now < buffer) {
      // Token is expired or about to expire — refresh it
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        // Can't refresh — sign out and throw
        await supabase.auth.signOut().catch(() => {});
        throw new Error('Session expired and could not be refreshed');
      }
      return refreshData.session.access_token;
    }
  } catch (e) {
    // If token parsing fails (malformed JWT), try refreshing
    if (e instanceof Error && e.message.includes('Session expired')) throw e;
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error('Session expired and could not be refreshed');
    }
    return refreshData.session.access_token;
  }

  return session.access_token;
}

/**
 * Call a Supabase Edge Function with a guaranteed fresh JWT.
 *
 * This replaces `supabase.functions.invoke()` to avoid the SDK's internal
 * session race condition.  We use direct `fetch()` and manually set:
 *   - `apikey` header (required by Supabase)
 *   - `Authorization` header (required when verify_jwt = true)
 *   - `Content-Type` header
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: unknown,
  retryOn401 = true,
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured');
  }

  const accessToken = await getFreshToken();

  const url = `${supabaseUrl}/functions/v1/${functionName}`;

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
    // The token we sent was rejected — force-refresh and retry once
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

        if (retryResponse.status === 401) {
          // Still 401 after refresh — session is truly invalid
          await supabase.auth.signOut().catch(() => {});
          throw new Error('Authentication failed — please log in again');
        }

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Edge function error: ${retryResponse.status}`);
        }

        return retryResponse.json() as Promise<T>;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Authentication failed')) throw e;
    }
    // Refresh failed — sign out
    await supabase.auth.signOut().catch(() => {});
    throw new Error('Authentication failed — please log in again');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Edge function error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
