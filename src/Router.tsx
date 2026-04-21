import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import QuizApp from './components/quiz/QuizApp';
import PricingPage from './pages/PricingPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import DashboardPage from './pages/DashboardPage';
import DicaPage from './pages/DicaPage';
import { PublicProfilePage } from './components/profile/PublicProfilePage';
import ProducerRegisterPage from './components/producer/ProducerRegisterPage';
import ProducerLoginPage from './components/producer/ProducerLoginPage';
import ProducerDashboardPage from './components/producer/ProducerDashboardPage';
import { ProducerPublicPage } from './components/producer/ProducerPublicPage';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { supabase } from './lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { captureReferral } from './lib/referral';

/** Wrapper that pulls :username from the URL and passes it to PublicProfilePage */
const PublicProfileRoute: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  return <PublicProfilePage username={username!} />;
};

/** Wrapper for producer public page at /p/:username */
const ProducerPublicRoute: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  return <ProducerPublicPage username={username!} />;
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
    // Capture referral code from URL (?ref=xxx) on first load
    captureReferral();

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
              <Route path="/" element={<QuizApp />} />
              <Route path="/login" element={<App />} />
              <Route path="/quiz" element={<QuizApp />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/dica" element={<DicaPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/u/:username" element={<PublicProfileRoute />} />
              {/* Producer routes */}
              <Route path="/producer/register" element={<ProducerRegisterPage />} />
              <Route path="/producer/login" element={<ProducerLoginPage />} />
              <Route path="/producer/dashboard" element={<ProducerDashboardPage />} />
              <Route path="/p/:username" element={<ProducerPublicRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </SubscriptionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
