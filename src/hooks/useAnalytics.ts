/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    ttq?: {
      page: () => void;
      track: (event: string, params?: Record<string, unknown>) => void;
      identify: (id: string, params?: Record<string, unknown>) => void;
    };
  }
}

/** GA4 Measurement ID — kept in sync with index.html */
const GA_MEASUREMENT_ID = 'G-YZ3N30DV7X';

type EventName =
  | 'quiz_start'
  | 'quiz_complete'
  | 'subscription_checkout'
  | 'rating'
  | 'watchlist_add'
  | 'share'
  | 'oracle_query'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'page_view'
  | 'conversion'
  | string;

interface TrackEventParams {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

interface UseAnalyticsReturn {
  trackEvent: (eventName: EventName, params?: TrackEventParams) => void;
  trackPageView: (path: string, title?: string) => void;
  trackConversion: (funnelStep: string, params?: TrackEventParams) => void;
}

/**
 * Returns true when GA4 gtag is available and we are in production.
 * GA4 is loaded by index.html — the hook does NOT load it again.
 */
function isGtagReady(): boolean {
  return import.meta.env.PROD && typeof window.gtag === 'function';
}

export function useAnalytics(): UseAnalyticsReturn {
  const trackEvent = useCallback((eventName: EventName, params?: TrackEventParams) => {
    if (!isGtagReady()) return;

    window.gtag('event', eventName, {
      event_category: params?.category ?? 'engagement',
      event_label: params?.label,
      value: params?.value,
      ...params,
    });
  }, []);

  /**
   * Sends a GA4 page_view event AND fires TikTok ttq.page().
   *
   * Uses gtag('event', 'page_view', …) which is the recommended SPA
   * method (instead of gtag('config', …) which was causing the initial
   * direct-load pageview to be lost).
   */
  const trackPageView = useCallback((path: string, title?: string) => {
    if (!isGtagReady()) return;

    const pageTitle = title ?? document.title;

    // GA4 page_view via event (recommended for SPA)
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: pageTitle,
      page_location: window.location.origin + path,
    });

    // Also fire TikTok Pixel page event (if available)
    if (typeof window.ttq?.page === 'function') {
      window.ttq.page();
    }
  }, []);

  const trackConversion = useCallback((funnelStep: string, params?: TrackEventParams) => {
    if (!isGtagReady()) return;

    window.gtag('event', 'conversion', {
      event_category: 'funnel',
      event_label: funnelStep,
      funnel_step: funnelStep,
      ...params,
    });
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackConversion,
  };
}
