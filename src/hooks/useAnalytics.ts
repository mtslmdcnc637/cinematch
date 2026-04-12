/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GtagArgs = any[];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
    gtag: (...args: GtagArgs) => void;
  }
}

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

function loadGA4Script(measurementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('ga4-script')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GA4 script'));
    document.head.appendChild(script);
  });
}

function initGA4(measurementId: string): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: GtagArgs) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
  });
}

export function useAnalytics(): UseAnalyticsReturn {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const isProduction = import.meta.env.PROD;

    if (!measurementId || !isProduction) return;

    initialized.current = true;

    loadGA4Script(measurementId)
      .then(() => {
        initGA4(measurementId);
      })
      .catch(() => {
        // Silently handle GA4 load failure
      });
  }, []);

  const trackEvent = useCallback((eventName: EventName, params?: TrackEventParams) => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const isProduction = import.meta.env.PROD;

    if (!measurementId || !isProduction || typeof window.gtag !== 'function') return;

    window.gtag('event', eventName, {
      event_category: params?.category ?? 'engagement',
      event_label: params?.label,
      value: params?.value,
      ...params,
    });
  }, []);

  const trackPageView = useCallback((path: string, title?: string) => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const isProduction = import.meta.env.PROD;

    if (!measurementId || !isProduction || typeof window.gtag !== 'function') return;

    window.gtag('config', measurementId, {
      page_path: path,
      page_title: title ?? document.title,
    });
  }, []);

  const trackConversion = useCallback((funnelStep: string, params?: TrackEventParams) => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const isProduction = import.meta.env.PROD;

    if (!measurementId || !isProduction || typeof window.gtag !== 'function') return;

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
