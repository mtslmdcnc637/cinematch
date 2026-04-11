import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Star, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const handleSubscribe = (planId: string) => {
    // Here we will integrate Stripe Checkout
    console.log(`Subscribe to ${planId}`);
    alert(`Integração com Stripe em breve para o plano: ${planId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-y-auto selection:bg-purple-500/30">
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
            <Star className="w-4 h-4 fill-current" />
            CineMatch PRO
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Desbloqueie o poder total do <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">Oráculo</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Swipes ilimitados, dicas infinitas e acesso direto à Inteligência Artificial para encontrar o filme perfeito em segundos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Mensal */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col relative">
            <h3 className="text-2xl font-bold mb-2">Mensal</h3>
            <p className="text-gray-400 mb-6">Para testar as águas.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">R$ 9</span>
              <span className="text-gray-500">/mês</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Swipes ilimitados</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Dicas diárias ilimitadas</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Oráculo de IA integrado</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Badge PRO no perfil</span></li>
            </ul>
            <button onClick={() => handleSubscribe('monthly')} className="w-full py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
              Assinar Mensal
            </button>
          </div>

          {/* Trimestral */}
          <div className="bg-purple-900/20 border-2 border-purple-500 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wider">
              Mais Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Trimestral</h3>
            <p className="text-purple-300 mb-6">O plano favorito da galera.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">R$ 24</span>
              <span className="text-gray-400">/3 meses</span>
              <div className="text-sm text-green-400 mt-1">Equivale a R$ 8/mês</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-200">Tudo do plano Mensal</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-200">Economia de 11%</span></li>
            </ul>
            <button onClick={() => handleSubscribe('quarterly')} className="w-full py-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02]">
              Assinar Trimestral
            </button>
          </div>

          {/* Anual */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/10 text-gray-300 text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wider border border-white/10">
              Melhor Custo-Benefício
            </div>
            <h3 className="text-2xl font-bold mb-2">Anual</h3>
            <p className="text-gray-400 mb-6">Para os verdadeiros cinéfilos.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">R$ 69</span>
              <span className="text-gray-500">/ano</span>
              <div className="text-sm text-green-400 mt-1">Equivale a R$ 5,75/mês</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Tudo do plano Mensal</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" /> <span className="text-gray-300">Economia de 36%</span></li>
            </ul>
            <button onClick={() => handleSubscribe('annual')} className="w-full py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">
              Assinar Anual
            </button>
          </div>
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
