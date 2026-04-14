/**
 * Utility for calling Supabase Edge Functions with fresh JWTs.
 *
 * Key design decisions:
 * - Uses `getSession()` which auto-refreshes expired tokens when
 *   `autoRefreshToken` is true (configured in supabase.ts).
 * - Does NOT call `supabase.auth.signOut()` — that is the responsibility
 *   of the auth layer (useAuth), not an HTTP utility.  Calling signOut()
 *   here caused a cascade that logged the user out of the entire app
 *   whenever a single API call's token refresh failed.
 * - On 401, retries once after forcing a `refreshSession()`.
 * - All errors are thrown; callers decide how to handle them.
 */

import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Get a valid access token.
 *
 * `getSession()` automatically refreshes the token when `autoRefreshToken`
 * is true, so we don't need to manually parse the JWT or call
 * `refreshSession()` proactively.  Manual refresh calls race with the
 * SDK's internal auto-refresh and can cause refresh-token-rotation
 * conflicts that result in forced sign-out.
 */
async function getFreshToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('No active session — user must be logged in');
  }

  return session.access_token;
}

/**
 * Call a Supabase Edge Function with a fresh JWT.
 *
 * On 401, forces a `refreshSession()` and retries once.
 * Never calls `signOut()` — auth state management is not
 * the responsibility of an HTTP utility.
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
