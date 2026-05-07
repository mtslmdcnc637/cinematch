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
    if (!hasTrackedInitial.current) {
      hasTrackedInitial.current = true;
      try {
        const initialPath = sessionStorage.getItem('ga_initial_path');
        if (initialPath === pagePath) {
          sessionStorage.removeItem('ga_initial_path');
          return;
        }
      } catch {}
    }

    trackPageView(pagePath, title);
  }, [pagePath, title, trackPageView]);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
}
