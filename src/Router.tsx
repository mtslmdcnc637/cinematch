import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import QuizApp from './components/quiz/QuizApp';
import PricingPage from './pages/PricingPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { PublicProfilePage } from './components/profile/PublicProfilePage';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { supabase } from './lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';

/** Wrapper that pulls :username from the URL and passes it to PublicProfilePage */
const PublicProfileRoute: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  return <PublicProfilePage username={username!} />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Router() {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SubscriptionProvider userId={userId}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/quiz" element={<QuizApp />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/u/:username" element={<PublicProfileRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </SubscriptionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
