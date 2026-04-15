import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Star, ShieldCheck, Lock, ArrowLeft, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/edgeFunction';
import { toast, Toaster } from 'sonner';
import { PRICING_PLANS } from '../config/quizData';

export default function PricingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setIsLoading(planId);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Faça login ou crie uma conta primeiro para assinar.', { duration: 5000 });
        navigate('/login?redirect=/pricing');
        setIsLoading(null);
        return;
      }

      // Call Stripe Checkout Edge Function via direct fetch for reliable auth
      const data = await invokeEdgeFunction<{ url?: string }>('stripe-checkout', {
        plan_id: planId,
        user_id: session.user.id,
        user_email: session.user.email,
      });

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao processar assinatura';
      toast.error(message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('portal');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Faça login primeiro.', { duration: 5000 });
        navigate('/login?redirect=/pricing');
        setIsLoading(null);
        return;
      }

      const data = await invokeEdgeFunction<{ url?: string }>('stripe-portal', {
        user_id: session.user.id,
      });

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao gerenciar assinatura';
      toast.error(message);
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
              <Lock className="w-4 h-4" /> Pagamento 100% Seguro via Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
