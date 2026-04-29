/**
 * PageTitle component — updates document.title and fires GA4 page_view
 * whenever the page changes.
 *
 * IMPORTANT: The first page_view for direct loads (e.g. /dica from ads)
 * is already fired in index.html right after gtag init. This component
 * fires page_view on mount AND on subsequent route changes.
 *
 * GA4 deduplicates when page_path + page_title are identical, so the
 * initial index.html pageview and this component's first fire won't
 * create duplicates.
 *
 * Usage: <PageTitle title="MrCine — Login" path="/login" />
 */
import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../../hooks/useAnalytics';

interface PageTitleProps {
  title: string;
  path?: string;
}

export function PageTitle({ title, path }: PageTitleProps) {
  const { trackPageView } = useAnalytics();
  const location = useLocation();
  const hasTrackedInitial = useRef(false);

  const pagePath = path || location.pathname + location.search;

  useEffect(() => {
    // Always track — both on initial mount and on subsequent route changes
    trackPageView(pagePath, title);

    // Mark initial track as done (for debugging purposes)
    if (!hasTrackedInitial.current) {
      hasTrackedInitial.current = true;
    }
  }, [pagePath, title, trackPageView]);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
}
