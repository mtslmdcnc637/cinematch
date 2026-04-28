import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
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
import { PageTitle } from './components/common/PageTitle';

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

/** External redirect component (for cross-domain redirects) */
function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.href = url;
  }, [url]);
  return null;
}

/**
 * Root route component:
 * - Logged in → redirect to /app (main app with feed, library, etc.)
 * - Not logged in → redirect to /login
 * - The quiz now lives at quiz.mrcine.pro
 */
function RootRedirect({ userId }: { userId: string | null | undefined }) {
  // Still checking auth state — show loading spinner
  if (userId === undefined) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (userId) {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function Router() {
  const [userId, setUserId] = useState<string | null | undefined>();

  useEffect(() => {
    // Capture referral code from URL (?ref=xxx) on first load
    captureReferral();

    if (!supabase) {
      // No supabase — not logged in
      setUserId(null);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SubscriptionProvider userId={userId || undefined}>
          <ErrorBoundary>
            <Routes>
              {/* Root: redirect based on auth state */}
              <Route path="/" element={<><PageTitle title="MrCine — Seu Guia de Cinema com IA" path="/" /><RootRedirect userId={userId} /></>} />
              {/* Login / main app (App.tsx handles both states) */}
              <Route path="/login" element={<><PageTitle title="MrCine — Login" path="/login" /><App /></>} />
              {/* Logged-in main app (same component, but this is the canonical route) */}
              <Route path="/app" element={<><PageTitle title="MrCine — Descobrir" path="/app" /><App /></>} />
              {/* Quiz is now at quiz.mrcine.pro — redirect any old links */}
              <Route path="/quiz" element={<ExternalRedirect url="https://quiz.mrcine.pro" />} />
              <Route path="/pricing" element={<><PageTitle title="MrCine — Planos" path="/pricing" /><PricingPage /></>} />
              <Route path="/terms" element={<><PageTitle title="MrCine — Termos de Uso" path="/terms" /><TermsPage /></>} />
              <Route path="/privacy" element={<><PageTitle title="MrCine — Privacidade" path="/privacy" /><PrivacyPage /></>} />
              <Route path="/dica" element={<><PageTitle title="MrCine — Dica Secreta" path="/dica" /><DicaPage /></>} />
              <Route path="/dashboard" element={<><PageTitle title="MrCine — Painel Admin" path="/dashboard" /><DashboardPage /></>} />
              <Route path="/u/:username" element={<PublicProfileRoute />} />
              {/* Producer routes */}
              <Route path="/producer/register" element={<><PageTitle title="MrCine — Cadastro Produtor" path="/producer/register" /><ProducerRegisterPage /></>} />
              <Route path="/producer/login" element={<><PageTitle title="MrCine — Login Produtor" path="/producer/login" /><ProducerLoginPage /></>} />
              <Route path="/producer/dashboard" element={<><PageTitle title="MrCine — Painel Produtor" path="/producer/dashboard" /><ProducerDashboardPage /></>} />
              <Route path="/p/:username" element={<ProducerPublicRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </SubscriptionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
