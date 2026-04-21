/**
 * Referral Cookie Utility
 *
 * When a user arrives via ?ref=PRODUCER_USERNAME (e.g., from TikTok),
 * we save the referral code in a cookie that persists for 30 days.
 * This cookie is later read during Stripe checkout to apply the
 * producer's 15% discount coupon and track commissions.
 */

const REFERRAL_COOKIE_NAME = 'mrcine_ref';
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Read the ?ref= parameter from the current URL and save it as a cookie.
 * Should be called once on app load (in Router or App).
 * Does NOT overwrite an existing cookie (first-touch attribution).
 */
export function captureReferral(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (refCode && refCode.length >= 2 && refCode.length <= 50) {
    // Only set if no existing cookie (first-touch attribution)
    const existing = getReferralCode();
    if (!existing) {
      document.cookie = [
        `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(refCode)}`,
        `max-age=${REFERRAL_COOKIE_MAX_AGE}`,
        'path=/',
        'SameSite=Lax',
        'Secure',
      ].join('; ');
      console.log('[referral] Captured referral code:', refCode);
      return refCode;
    }
    // Already have a cookie — don't overwrite (first-touch wins)
    console.log('[referral] Existing referral code preserved:', existing);
    return existing;
  }

  return getReferralCode();
}

/**
 * Get the stored referral code from the cookie.
 * Returns null if no cookie exists.
 */
export function getReferralCode(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === REFERRAL_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
