import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ArrowLeft, Crown, PartyPopper, Settings, CreditCard, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/edgeFunction';
import { toast, Toaster } from 'sonner';
import { PRICING_PLANS } from '../config/quizData';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { refreshSubscription, isPro, planType } = useSubscription();

  // Handle Stripe redirect back
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      refreshSubscription();
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => navigate('/'), 5000);
      return () => clearTimeout(timer);
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Assinatura cancelada. Nenhuma cobrança foi feita.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handleSubscribe = async (planId: string) => {
    setIsLoading(planId);

    try {
      // invokeEdgeFunction handles token refresh internally (getFreshToken + retry on 401)
      // via a mutex that prevents concurrent refresh calls.
      // We need the session to get user identity for the edge function.
      const sessionResult = supabase ? await supabase.auth.getSession() : null;
      const session = sessionResult?.data?.session;
      if (!session) {
        toast.error('Faça login ou crie uma conta primeiro para assinar.', { duration: 5000 });
        return;
      }

      const data = await invokeEdgeFunction<{ url?: string }>('stripe-checkout', {
        plan_id: planId,
        user_id: session.user.id,
        user_email: session.user.email,
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error('[handleSubscribe] No URL returned from stripe-checkout');
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao processar assinatura';
      console.error('[handleSubscribe] Error:', message);
      if (message.includes('401') || message.includes('Authentication failed') || message.includes('No active session')) {
        // Try a session refresh before giving up
        try {
          const { data: refreshData } = await supabase?.auth.refreshSession() || {};
          if (refreshData?.session) {
            toast.info('Sessão atualizada. Tente novamente.', { duration: 3000 });
            return;
          }
        } catch { /* refresh failed */ }
        toast.error('Sessão expirada. Faça login novamente.', { duration: 6000 });
      } else {
        toast.error(message, { duration: 6000 });
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('portal');

    try {
      // invokeEdgeFunction handles token refresh internally via mutex.
      // getSession() returns stable user identity (id, email) even when
      // the access_token is expired — invokeEdgeFunction will attach a
      // fresh JWT via the Authorization header.
      const sessionResult = supabase ? await supabase.auth.getSession() : null;
      const session = sessionResult?.data?.session;
      if (!session) {
        toast.error('Faça login primeiro.', { duration: 6000 });
        return;
      }

      const data = await invokeEdgeFunction<{ url?: string }>('stripe-portal', {
        user_id: session.user.id,
        return_url: `${window.location.origin}/pricing`,
      });

      console.log('[handleManageSubscription] Stripe portal response:', data);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error('[handleManageSubscription] No URL returned from stripe-portal');
        toast.error('Não foi possível abrir o portal de assinatura. Tente novamente em alguns instantes.', { duration: 6000 });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao gerenciar assinatura';
      console.error('[handleManageSubscription] Error:', message);
      if (message.includes('401') || message.includes('Authentication failed') || message.includes('No active session')) {
        // Try a session refresh before giving up
        try {
          const { data: refreshData } = await supabase?.auth.refreshSession() || {};
          if (refreshData?.session) {
            toast.info('Sessão atualizada. Tente novamente.', { duration: 3000 });
            return;
          }
        } catch { /* refresh failed */ }
        toast.error('Sessão expirada. Faça login novamente.', { duration: 6000 });
      } else if (message.includes('No Stripe customer') || message.includes('404') || message.includes('No Stripe customer found')) {
        toast.error('Nenhuma assinatura ativa encontrada. Verifique seu status.', { duration: 6000 });
        refreshSubscription();
      } else {
        toast.error(message, { duration: 6000 });
      }
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-y-auto selection:bg-purple-500/30">
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        {/* Success Banner — replaces all other content */}
        {showSuccess ? (
          <div className="mt-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <PartyPopper className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-green-400 mb-3">Pagamento confirmado!</h2>
            <p className="text-gray-300 mb-4 text-lg">
              Sua assinatura MrCine PRO está ativa. Aproveite swipes ilimitados, dicas infinitas e o Oráculo de IA!
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Redirecionando em 5 segundos...
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-10 py-4 rounded-xl transition-all text-lg"
            >
              Começar a usar 🍿
            </button>
          </div>
        ) : isPro ? (
          /* ── Already PRO: show management card instead of pricing ── */
          <div className="mt-8 max-w-lg mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-6 border border-amber-500/20">
              <Crown className="w-4 h-4 fill-current" />
              Assinatura Ativa
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/20 border border-purple-500/30 rounded-3xl p-8 mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                <Crown className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-3xl font-bold mb-2">MrCine PRO</h2>
              <p className="text-purple-300 text-lg font-medium mb-4">
                Plano {planType === 'monthly' ? 'Mensal' : planType === 'quarterly' ? 'Trimestral' : planType === 'annual' ? 'Anual' : 'PRO'}
              </p>
              <p className="text-gray-400 mb-8">
                Você tem acesso completo a todos os recursos: swipes ilimitados, dicas infinitas e o Oráculo de IA.
              </p>

              <button
                onClick={handleManageSubscription}
                disabled={isLoading === 'portal'}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-3 mx-auto border border-white/10 disabled:opacity-50"
              >
                <Settings className="w-5 h-5" />
                {isLoading === 'portal' ? 'Carregando...' : 'Gerenciar Assinatura'}
              </button>
              <p className="text-gray-600 text-xs mt-3">
                Altere seu plano, atualize pagamento ou cancele
              </p>
            </div>
          </div>
        ) : (
          /* ── Free user: show pricing cards ── */
          <>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-6 border border-purple-500/20">
                <Crown className="w-4 h-4 fill-current" />
                MrCine PRO
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Desbloqueie o poder total do <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">Oráculo</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Swipes ilimitados, dicas infinitas e acesso direto à Inteligência Artificial para encontrar o filme perfeito em segundos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {PRICING_PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col relative transition-all ${
                    plan.popular
                      ? 'bg-purple-900/20 border-2 border-purple-500 transform md:-translate-y-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                      Mais Popular
                    </div>
                  )}
                  {!plan.popular && plan.savings && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/10 text-gray-300 text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wider border border-white/10">
                      {plan.savings}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`mb-6 ${plan.popular ? 'text-purple-300' : 'text-gray-400'}`}>
                    {plan.id === 'monthly' ? 'Para testar as águas.' : plan.id === 'quarterly' ? 'O plano favorito da galera.' : 'Para os verdadeiros cinéfilos.'}
                  </p>
                  <div className="mb-8">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                    {plan.id === 'quarterly' && (
                      <div className="text-sm text-green-400 mt-1">Equivale a R$ 8/mês</div>
                    )}
                    {plan.id === 'annual' && (
                      <div className="text-sm text-green-400 mt-1">Equivale a R$ 5,75/mês</div>
                    )}
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Swipes ilimitados</span></li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Dicas diárias ilimitadas</span></li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Oráculo de IA integrado</span></li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Badge PRO no perfil</span></li>
                    {plan.id !== 'monthly' && (
                      <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-200">Economia de {plan.id === 'quarterly' ? '11' : '36'}%</span></li>
                    )}
                    {plan.id === 'monthly' && (
                      <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-200">Garantia de 7 dias</span></li>
                    )}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading === plan.id}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${
                      plan.popular
                        ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transform hover:scale-[1.02]'
                        : 'bg-white/10 hover:bg-white/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading === plan.id ? 'Processando...' : `Assinar ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>

            {/* Manage Subscription */}
            <div className="text-center mb-12">
              <button
                onClick={handleManageSubscription}
                disabled={isLoading === 'portal'}
                className="text-gray-400 hover:text-white transition-colors text-sm underline underline-offset-4 disabled:opacity-50"
              >
                {isLoading === 'portal' ? 'Carregando...' : 'Já é assinante? Gerencie sua assinatura'}
              </button>
            </div>

            {/* Guarantee & Trust */}
            <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
              <ShieldCheck className="w-12 h-12 text-green-400 shrink-0" />
              <div>
                <h4 className="font-bold text-lg mb-2">Garantia de 7 Dias</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Se você não sentir que economizou tempo e encontrou filmes melhores na primeira semana, devolvemos 100% do seu dinheiro. Sem perguntas.
                </p>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <CreditCard className="w-4 h-4" /> Pagamento 100% Seguro via Stripe
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
