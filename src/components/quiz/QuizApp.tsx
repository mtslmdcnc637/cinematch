import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2, PlayCircle, Lock } from 'lucide-react';
import { QUIZ_PHASES, QUIZ_QUESTIONS, LOADING_TEXTS, RESULT_BENEFITS, PRICING_PLANS } from '../../config/quizData';

// Map string icon names to actual Lucide components
const IconMap: Record<string, any> = {
  Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck
};

type QuizStep = 'start' | 'question' | 'loading' | 'result' | 'pricing';

export default function QuizApp() {
  const [step, setStep] = useState<QuizStep>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('quarterly');

  // Timer for pricing page (15 minutes)
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (step === 'pricing') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setStep('question');

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      startLoading();
    }
  };

  const startLoading = () => {
    setStep('loading');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setLoadingProgress(progress);
      
      if (progress % 20 === 0) {
        setLoadingTextIndex(prev => Math.min(prev + 1, LOADING_TEXTS.length - 1));
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('result'), 500);
      }
    }, 60);
  };

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  
  const isNextDisabled = () => {
    if (!currentAnswer) return true;
    if (currentQuestion.type === 'multiple' && currentQuestion.min) {
      return currentAnswer.length < currentQuestion.min;
    }
    if (currentQuestion.type === 'input') {
      return currentAnswer.trim().length < 2;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative selection:bg-purple-500/30">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-8 min-h-screen flex flex-col">
        
        {/* Header / Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Film className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold tracking-tight">CineMatch<span className="text-purple-500">PRO</span></span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          
          {/* START SCREEN */}
          {step === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col items-center justify-center text-center mt-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-6 border border-purple-500/20">
                <SparklesIcon className="w-4 h-4" />
                Descubra seu Perfil Cinematográfico
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Descubra qual é o seu Perfil Cinematográfico e pare de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">perder 40 minutos</span> escolhendo o que assistir.
              </h1>
              
              <p className="text-gray-400 text-lg mb-10 max-w-md">
                Responda a este quiz rápido para gerar um algoritmo 100% focado no seu gosto pessoal.
              </p>
              
              <button 
                onClick={handleStart}
                className="w-full max-w-sm bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
              >
                Começar Agora <ArrowRight className="w-5 h-5" />
              </button>

              {/* Testimonials Section */}
              <div className="mt-16 w-full max-w-md text-left">
                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-4 text-center">O que dizem nossos usuários</p>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center font-bold text-white">M</div>
                    <div>
                      <p className="font-bold text-sm text-white">Mariana S.</p>
                      <div className="flex text-amber-400">
                        <Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm italic">"Finalmente parei de brigar com meu namorado pra escolher filme. O app sempre acerta o que a gente quer ver!"</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white">R</div>
                    <div>
                      <p className="font-bold text-sm text-white">Rafael C.</p>
                      <div className="flex text-amber-400">
                        <Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm italic">"A função de mostrar em qual streaming o filme está salvou minha vida. Vale cada centavo do plano PRO."</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* QUESTION SCREEN */}
          {step === 'question' && (
            <motion.div 
              key={`q-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col"
            >
              {/* Progress Bar */}
              <div className="mb-10">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-3">
                  {QUIZ_PHASES.map(phase => (
                    <span key={phase.id} className={currentQuestion.phase >= phase.id ? 'text-purple-400' : ''}>
                      {phase.label}
                    </span>
                  ))}
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden flex">
                  {QUIZ_PHASES.map(phase => (
                    <div 
                      key={phase.id} 
                      className={`h-full transition-all duration-500 ${currentQuestion.phase > phase.id ? 'bg-purple-500' : currentQuestion.phase === phase.id ? 'bg-purple-500' : 'bg-transparent'}`}
                      style={{ width: `${100 / QUIZ_PHASES.length}%`, opacity: currentQuestion.phase === phase.id ? 0.5 + (0.5 * (currentQuestionIndex % 2)) : 1 }}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2">{currentQuestion.title}</h2>
              {currentQuestion.subtitle && (
                <p className="text-gray-400 mb-8">{currentQuestion.subtitle}</p>
              )}

              <div className="flex-1 mt-6">
                {currentQuestion.type === 'input' ? (
                  <input
                    type={currentQuestion.id === 'email' ? 'email' : 'text'}
                    placeholder={currentQuestion.placeholder}
                    value={currentAnswer || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                    autoFocus
                  />
                ) : (
                  <div className="grid gap-3">
                    {currentQuestion.options?.map(option => {
                      const isSelected = currentQuestion.type === 'multiple' 
                        ? (currentAnswer || []).includes(option.id)
                        : currentAnswer === option.id;
                      
                      const Icon = option.icon ? IconMap[option.icon] : null;

                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            if (currentQuestion.type === 'single') {
                              handleAnswer(currentQuestion.id, option.id);
                              // Auto-advance on single select after a tiny delay
                              setTimeout(handleNextQuestion, 300);
                            } else {
                              const curr = currentAnswer || [];
                              const next = curr.includes(option.id) 
                                ? curr.filter((id: string) => id !== option.id)
                                : [...curr, option.id];
                              handleAnswer(currentQuestion.id, next);
                            }
                          }}
                          className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                            isSelected 
                              ? 'bg-purple-500/20 border-purple-500' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {Icon && <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'}`} />}
                            <span className={`text-lg font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                              {option.label}
                            </span>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={handleNextQuestion}
                  disabled={isNextDisabled()}
                  className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                    isNextDisabled() 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* LOADING SCREEN */}
          {step === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="relative w-32 h-32 mb-8">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="4" />
                  <motion.circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="4"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * loadingProgress) / 100}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{loadingProgress}%</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Criando seu plano sob medida</h2>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={loadingTextIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-purple-400 text-lg"
                >
                  {LOADING_TEXTS[loadingTextIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {/* RESULT SCREEN */}
          {step === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Seu Perfil Cinematográfico está pronto!</h2>
                <p className="text-gray-400 text-lg">
                  Analisamos suas respostas e criamos um algoritmo exclusivo para o seu gosto. Veja o que você vai conquistar:
                </p>
              </div>

              <div className="grid gap-4 mb-10">
                {RESULT_BENEFITS.map((benefit, i) => {
                  const Icon = IconMap[benefit.icon];
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="bg-white/5 border border-white/10 p-5 rounded-2xl flex gap-4"
                    >
                      <div className="bg-purple-500/20 p-3 rounded-xl h-fit">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">{benefit.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button 
                onClick={() => setStep('pricing')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02]"
              >
                Ver Meu Plano
              </button>
            </motion.div>
          )}

          {/* PRICING SCREEN */}
          {step === 'pricing' && (
            <motion.div 
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col pb-10"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Escolha seu acesso Pro</h2>
                
                {/* Real Urgency */}
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-4 py-2 rounded-full font-medium text-sm">
                  <Star className="w-4 h-4 fill-current" />
                  Preço de lançamento válido para os primeiros 100 usuários
                </div>
              </div>

              <div className="grid gap-4 mb-8">
                {PRICING_PLANS.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id 
                        ? 'bg-purple-900/20 border-purple-500' 
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Mais Popular
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                        {plan.savings && (
                          <span className="text-green-400 text-sm font-medium">{plan.savings}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{plan.price}</div>
                        <div className="text-gray-500 text-sm">{plan.period}</div>
                      </div>
                    </div>
                    
                    <div className={`absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPlan === plan.id ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                    }`}>
                      {selectedPlan === plan.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02] mb-6">
                Assinar Agora
              </button>

              {/* Guarantee & Trust */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-green-400 shrink-0" />
                <div>
                  <h4 className="font-bold mb-1">Garantia de 7 Dias</h4>
                  <p className="text-gray-400 text-sm">
                    Se você não sentir que economizou tempo e encontrou filmes melhores na primeira semana, devolvemos 100% do seu dinheiro. Sem perguntas.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center items-center gap-2 text-gray-500 text-sm">
                <Lock className="w-4 h-4" /> Pagamento 100% Seguro
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
