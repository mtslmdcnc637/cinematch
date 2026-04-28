/**
 * PageTitle component — updates document.title and fires GA4 pageview
 * whenever the page changes. Uses react-helmet-async for SSR-safe title
 * changes and the existing useAnalytics hook for GA tracking.
 *
 * Usage: <PageTitle title="MrCine — Login" path="/login" />
 */
import { useEffect } from 'react';
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

  const pagePath = path || location.pathname + location.search;

  useEffect(() => {
    trackPageView(pagePath, title);
  }, [pagePath, title, trackPageView]);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
}
