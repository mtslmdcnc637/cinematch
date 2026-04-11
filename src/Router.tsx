import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import QuizApp from './components/quiz/QuizApp';
import PricingPage from './pages/PricingPage';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { supabase } from './lib/supabase';

export default function Router() {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    if (!supabase) return;
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <SubscriptionProvider userId={userId}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/quiz" element={<QuizApp />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SubscriptionProvider>
    </BrowserRouter>
  );
}
