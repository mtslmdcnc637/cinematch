import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2, Lock, Crown, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QUIZ_PHASES, QUIZ_QUESTIONS, LOADING_TEXTS, RESULT_BENEFITS, PRICING_PLANS } from '../../config/quizData';
import { supabase } from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { invokeEdgeFunction } from '../../lib/edgeFunction';
import { GENRES } from '../../constants';
import { ProBadge } from '../common/ProBadge';
import { toast } from 'sonner';

// Map string icon names to actual Lucide components
const IconMap: Record<string, any> = {
  Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck
};

// ──────── PROFILE SCORING ALGORITHM ────────

interface CinematographicProfile {
  name: string;
  description: string;
  icon: string;
  color: string;
  genreIds: number[];
  discoverParams: Record<string, string>;
}

const PROFILES: Record<string, CinematographicProfile> = {
  'aventureiro-noturno': {
    name: 'Aventureiro Noturno',
    description: 'Você busca adrenalina e emoção nas madrugadas. Filmes de ação, ficção científica e suspense são seu combustível. Quanto mais intenso, melhor!',
    icon: '🌙',
    color: 'from-indigo-600 to-purple-500',
    genreIds: [28, 878, 53],
    discoverParams: { with_genres: '28,878', sort_by: 'popularity.desc' },
  },
  'cinefilo-contemplativo': {
    name: 'Cinéfilo Contemplativo',
    description: 'Você aprecia a sétima arte em sua forma mais pura. Dramas profundos, roteiros elaborados e atuações marcantes fazem seu coração bater mais forte.',
    icon: '🎬',
    color: 'from-amber-600 to-orange-500',
    genreIds: [18, 99, 14],
    discoverParams: { with_genres: '18', sort_by: 'vote_average.desc', 'vote_count.gte': '100' },
  },
  'romantico-serial': {
    name: 'Romântico Serial',
    description: 'Seu coração bate mais forte com histórias de amor. Comédias românticas, dramas emocionais e narrativas que aquecem a alma são seu refúgio.',
    icon: '💕',
    color: 'from-pink-600 to-rose-500',
    genreIds: [10749, 35, 18],
    discoverParams: { with_genres: '10749,35', sort_by: 'popularity.desc' },
  },
  'explorador-criativo': {
    name: 'Explorador Criativo',
    description: 'Você adora sair da zona de conforto. Animações, fantasia e ficção científica te levam a mundos impossíveis. Sua imaginação não tem limites!',
    icon: '✨',
    color: 'from-emerald-600 to-teal-500',
    genreIds: [16, 14, 878],
    discoverParams: { with_genres: '16,14', sort_by: 'popularity.desc' },
  },
  'critico-de-sofa': {
    name: 'Crítico de Sofá',
    description: 'Você assiste com olhar analítico. Suspense, terror e documentários são seus favoritos. Nada escapa ao seu julgamento afiado!',
    icon: '🧐',
    color: 'from-red-600 to-rose-600',
    genreIds: [53, 27, 99],
    discoverParams: { with_genres: '53,27', sort_by: 'vote_average.desc', 'vote_count.gte': '100' },
  },
  'maratonador-felipe': {
    name: 'Maratonador Universal',
    description: 'Você é eclético e assiste de tudo um pouco! Comédias, ação, drama — contanto que seja bom, você está dentro. A variedade é sua marca registrada.',
    icon: '🍿',
    color: 'from-purple-600 to-fuchsia-500',
    genreIds: [35, 28, 18, 878],
    discoverParams: { sort_by: 'popularity.desc' },
  },
};

function calculateProfile(answers: Record<string, any>): CinematographicProfile {
  const scores: Record<string, number> = {};

  // Goal-based scoring
  const goalMap: Record<string, string> = {
    relax: 'maratonador-felipe',
    learn: 'cinefilo-contemplativo',
    feel: 'romantico-serial',
    distract: 'aventureiro-noturno',
  };
  if (answers.goal && goalMap[answers.goal]) {
    scores[goalMap[answers.goal]] = (scores[goalMap[answers.goal]] || 0) + 3;
  }

  // Genre-based scoring
  const genreMap: Record<string, string[]> = {
    action: ['aventureiro-noturno'],
    scifi: ['aventureiro-noturno', 'explorador-criativo'],
    drama: ['cinefilo-contemplativo', 'romantico-serial'],
    comedy: ['maratonador-felipe'],
    thriller: ['critico-de-sofa'],
    doc: ['cinefilo-contemplativo', 'critico-de-sofa'],
    romance: ['romantico-serial'],
  };
  const selectedGenres = answers.genres || [];
  selectedGenres.forEach((g: string) => {
    (genreMap[g] || []).forEach(p => {
      scores[p] = (scores[p] || 0) + 2;
    });
  });

  // Era preference
  if (answers.era === 'classics') {
    scores['cinefilo-contemplativo'] = (scores['cinefilo-contemplativo'] || 0) + 2;
  }

  // Format preference
  if (answers.format === 'series') {
    scores['maratonador-felipe'] = (scores['maratonador-felipe'] || 0) + 1;
  }

  // Time of day
  if (answers.time === 'latenight') {
    scores['aventureiro-noturno'] = (scores['aventureiro-noturno'] || 0) + 2;
  }

  // Frustrations
  if (answers.struggle === 'time_lost') {
    scores['maratonador-felipe'] = (scores['maratonador-felipe'] || 0) + 1;
  }
  if (answers.struggle === 'where') {
    scores['critico-de-sofa'] = (scores['critico-de-sofa'] || 0) + 1;
  }

  // Plot twists
  if (answers.plot_twists === 'love') {
    scores['aventureiro-noturno'] = (scores['aventureiro-noturno'] || 0) + 1;
    scores['critico-de-sofa'] = (scores['critico-de-sofa'] || 0) + 1;
  }

  // Recommendations
  if (answers.recommendations === 'research') {
    scores['critico-de-sofa'] = (scores['critico-de-sofa'] || 0) + 1;
    scores['cinefilo-contemplativo'] = (scores['cinefilo-contemplativo'] || 0) + 1;
  }

  // Find the highest scoring profile
  let maxScore = 0;
  let bestProfile = 'maratonador-felipe';

  for (const [profile, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestProfile = profile;
    }
  }

  return PROFILES[bestProfile];
}

// ──────── WHATSAPP VALIDATION (BR) ────────

/**
 * Formats and validates Brazilian phone numbers.
 * Accepts formats: (11) 99999-9999, 11999999999, +55 11 99999-9999, etc.
 * Returns { formatted, digits, isValid }
 */
function formatWhatsApp(value: string): { formatted: string; digits: string; isValid: boolean } {
  // Strip everything except digits
  const digits = value.replace(/\D/g, '');

  // Remove leading +55 or 55 if present
  const national = digits.startsWith('55') ? digits.slice(2) : digits;

  // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  let formatted = '';
  if (national.length === 0) {
    formatted = '';
  } else if (national.length <= 2) {
    formatted = `(${national}`;
  } else if (national.length <= 7) {
    formatted = `(${national.slice(0, 2)}) ${national.slice(2)}`;
  } else {
    formatted = `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7, 11)}`;
  }

  // Valid BR mobile: 11 digits starting with a valid DDD (not 00) and 9 after DDD
  const isValid = national.length === 11
    && /^[1-9]{2}9\d{8}$/.test(national);

  return { formatted, digits: national, isValid };
}

// TMDB fetch via Supabase Edge Function (tmdb-proxy)
// tmdb-proxy has verify_jwt = false, so it works with just the apikey header.
// No user session is required.
async function fetchProfileMovies(params: Record<string, string>): Promise<any[]> {
  try {
    if (!supabase) return [];

    const data = await invokeEdgeFunction<{ results?: any[] }>('tmdb-proxy', {
      endpoint: 'discover/movie',
      params: { language: 'pt-BR', ...params },
    });
    return data?.results || [];
  } catch {
    return [];
  }
}

// Save quiz progress to Supabase (for analytics / future dashboard)
async function saveQuizProgress(answers: Record<string, any>, currentStep: number, completed: boolean) {
  try {
    if (!supabase) return;
    await supabase
      .from('quiz_responses')
      .insert({
        name: answers.name || null,
        email: answers.email || null,
        whatsapp: answers.whatsapp || null,
        profile_type: completed ? calculateProfile(answers).name : null,
        answers: answers,
        last_step: currentStep,
        completed: completed,
      });
  } catch {
    // Silently fail — this is analytics, not critical
  }
}

type QuizStep = 'start' | 'question' | 'loading' | 'result' | 'signup' | 'pricing';

export default function QuizApp() {
  const navigate = useNavigate();
  const [step, setStep] = useState<QuizStep>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Profile result
  const [profileResult, setProfileResult] = useState<CinematographicProfile | null>(null);
  const [profileMovies, setProfileMovies] = useState<any[]>([]);

  // Removed fake timer — using real urgency instead
  const EARLY_BIRD_LIMIT = 100;

  const handleStart = () => setStep('question');

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      // Save progress for analytics (which step they reached)
      saveQuizProgress(answers, nextIndex, false);
    } else {
      startLoading();
    }
  };

  const startLoading = async () => {
    setStep('loading');
    // Save completed quiz
    saveQuizProgress(answers, QUIZ_QUESTIONS.length, true);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setLoadingProgress(progress);

      if (progress % 20 === 0) {
        setLoadingTextIndex(prev => Math.min(prev + 1, LOADING_TEXTS.length - 1));
      }

      if (progress >= 100) {
        clearInterval(interval);
        // Calculate profile
        const profile = calculateProfile(answers);
        setProfileResult(profile);

        // Fetch movies for the profile
        fetchProfileMovies(profile.discoverParams).then(movies => {
          setProfileMovies(movies.slice(0, 6));
        });

        setTimeout(() => setStep('result'), 500);
      }
    }, 60);
  };

  // Handle account creation on the signup step
  const handleSignUp = async () => {
    if (!answers.email) {
      toast.error('E-mail não encontrado. Refaça o quiz.');
      return;
    }
    if (signupPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsSigningUp(true);
    try {
      await supabaseService.signUpWithEmail(answers.email, signupPassword, answers.name || 'Usuário');
      // Wait for session to be established (works because mailer_autoconfirm = true)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if we have a session now
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.success('Conta criada com sucesso!');
        setStep('pricing');
      } else {
        // Email already exists — sign in instead
        try {
          await supabaseService.signInWithEmail(answers.email, signupPassword);
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            toast.success('Login realizado!');
            setStep('pricing');
          } else {
            toast.error('Não foi possível fazer login. Tente novamente.');
          }
        } catch {
          toast.error('Este e-mail já está cadastrado com outra senha. Faça login manualmente.', { duration: 5000 });
          navigate('/login?redirect=/pricing');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta';
      toast.error(message, { duration: 5000 });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setIsSubscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Should not happen since signup step creates a session,
        // but handle gracefully just in case
        toast.error('Sessão expirada. Faça login novamente.', { duration: 5000 });
        navigate('/login?redirect=/pricing');
        setIsSubscribing(false);
        return;
      }

      const data = await invokeEdgeFunction<{ url?: string }>('stripe-checkout', {
        plan_id: planId,
        user_id: session.user.id,
        user_email: session.user.email || answers.email,
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao processar assinatura';
      toast.error(message, { duration: 5000 });
    } finally {
      setIsSubscribing(false);
    }
  };

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  const isNextDisabled = () => {
    if (!currentAnswer) return true;
    if (currentQuestion.type === 'multiple' && currentQuestion.min) {
      return currentAnswer.length < currentQuestion.min;
    }
    if (currentQuestion.type === 'input') {
      // WhatsApp field is optional — only validate if something was typed
      if (currentQuestion.id === 'whatsapp') {
        if (!currentAnswer || currentAnswer.replace(/\D/g, '').length === 0) return false;
        const { isValid } = formatWhatsApp(currentAnswer);
        return !isValid;
      }
      return currentAnswer.trim().length < 2;
    }
    return false;
  };

  // WhatsApp input display value
  const [whatsappDisplay, setWhatsappDisplay] = useState('');

  const handleWhatsAppChange = (value: string) => {
    const { formatted, digits } = formatWhatsApp(value);
    setWhatsappDisplay(formatted);
    handleAnswer('whatsapp', digits.length > 0 ? digits : '');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden relative selection:bg-purple-500/30">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 min-h-screen flex flex-col">

        {/* Header / Logo */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            <span className="text-xl sm:text-2xl font-bold tracking-tight">MrCine<span className="text-purple-500">PRO</span></span>
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
              className="flex-1 flex flex-col items-center justify-start text-center mt-2 sm:mt-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-purple-500/10 text-purple-400 text-xs sm:text-sm font-medium mb-3 sm:mb-6 border border-purple-500/20">
                <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                Descubra seu Perfil Cinematográfico
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3 sm:mb-6">
                Descubra seu Perfil Cinematográfico e pare de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">perder 40 minutos</span> escolhendo o que assistir.
              </h1>

              <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-10 max-w-md">
                Responda a este quiz rápido para gerar um algoritmo 100% focado no seu gosto pessoal.
              </p>

              {/* Testimonials */}
              <div className="mt-8 sm:mt-16 w-full max-w-md text-left">
                <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider font-bold mb-3 sm:mb-4 text-center">O que dizem nossos usuários</p>
                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl mb-3 sm:mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center font-bold text-white text-sm">M</div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">Mariana S.</p>
                      <div className="flex text-amber-400">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm italic">"Finalmente parei de brigar com meu namorado pra escolher filme. O app sempre acerta o que a gente quer ver!"</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl mb-3 sm:mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">R</div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">Rafael C.</p>
                      <div className="flex text-amber-400">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm italic">"A função de mostrar em qual streaming o filme está salvou minha vida. Vale cada centavo do plano PRO."</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white text-sm">L</div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">Lucas M.</p>
                      <div className="flex text-amber-400">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm italic">"O Oráculo de IA me recomendou 3 filmes perfeitos em 5 segundos. Eu demoraria 40 minutos pra achar um desses."</p>
                </div>
              </div>

              {/* CTA + Login below testimonials */}
              <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center gap-3 w-full max-w-sm">
                <button
                  onClick={handleStart}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 sm:py-4 px-8 rounded-2xl text-base sm:text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
                >
                  Começar Agora <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full text-gray-400 hover:text-white font-medium py-3 px-6 rounded-2xl transition-colors text-sm underline underline-offset-4"
                >
                  Já tenho conta — Login
                </button>
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
              <div className="mb-4 sm:mb-10">
                <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-500 mb-2 sm:mb-3">
                  {QUIZ_PHASES.map(phase => (
                    <span key={phase.id} className={currentQuestion.phase >= phase.id ? 'text-purple-400' : ''}>
                      {phase.label}
                    </span>
                  ))}
                </div>
                <div className="h-1 sm:h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500"
                    style={{ width: `${((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 text-right">{currentQuestionIndex + 1} de {QUIZ_QUESTIONS.length}</p>
              </div>

              <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{currentQuestion.title}</h2>
              {currentQuestion.subtitle && (
                <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-8">{currentQuestion.subtitle}</p>
              )}

              <div className="flex-1 mt-3 sm:mt-6">
                {currentQuestion.type === 'input' ? (
                  currentQuestion.id === 'whatsapp' ? (
                    /* WhatsApp input with phone icon and formatting */
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input
                        type="tel"
                        placeholder={currentQuestion.placeholder}
                        value={whatsappDisplay}
                        onChange={(e) => handleWhatsAppChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 sm:py-5 pl-12 pr-6 text-lg sm:text-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                        autoFocus
                      />
                      {answers.whatsapp && answers.whatsapp.length > 0 && !formatWhatsApp(answers.whatsapp).isValid && (
                        <p className="text-amber-400 text-xs mt-2 ml-1">
                          Digite um número válido: DDD + 9 + 8 dígitos
                        </p>
                      )}
                      {answers.whatsapp && formatWhatsApp(answers.whatsapp).isValid && (
                        <p className="text-green-400 text-xs mt-2 ml-1">
                          Número válido!
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type={currentQuestion.id === 'email' ? 'email' : 'text'}
                      placeholder={currentQuestion.placeholder}
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 sm:py-5 px-6 text-lg sm:text-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                      autoFocus
                    />
                  )
                ) : (
                  <div className="grid gap-2 sm:gap-3">
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
                              setTimeout(handleNextQuestion, 300);
                            } else {
                              const curr = currentAnswer || [];
                              const next = curr.includes(option.id)
                                ? curr.filter((id: string) => id !== option.id)
                                : [...curr, option.id];
                              handleAnswer(currentQuestion.id, next);
                            }
                          }}
                          className={`w-full text-left p-3.5 sm:p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            {Icon && <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'}`} />}
                            <span className={`text-sm sm:text-lg font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                              {option.label}
                            </span>
                          </div>
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                            isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                <button
                  onClick={handleNextQuestion}
                  disabled={isNextDisabled()}
                  className={`w-full py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-bold transition-all ${
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
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6 sm:mb-8">
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
                  <span className="text-2xl sm:text-3xl font-bold text-white">{loadingProgress}%</span>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Criando seu perfil sob medida</h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingTextIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-purple-400 text-base sm:text-lg"
                >
                  {LOADING_TEXTS[loadingTextIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {/* RESULT SCREEN */}
          {step === 'result' && profileResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col pb-6 sm:pb-10"
            >
              {/* Profile Card */}
              <div className="text-center mb-6 sm:mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, delay: 0.2 }}
                  className={`w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full bg-gradient-to-br ${profileResult.color} flex items-center justify-center text-4xl sm:text-6xl shadow-[0_0_50px_rgba(168,85,247,0.3)] mb-4 sm:mb-6`}
                >
                  {profileResult.icon}
                </motion.div>
                <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Você é o <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">{profileResult.name}</span>!</h2>
                <p className="text-gray-400 text-sm sm:text-lg leading-relaxed max-w-md mx-auto">{profileResult.description}</p>
              </div>

              {/* Movie Grid */}
              {profileMovies.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-sm sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                    <Film className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    Filmes selecionados para você
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {profileMovies.map((movie: any) => (
                      <div key={movie.id} className="relative aspect-[2/3] rounded-xl overflow-hidden group">
                        <img
                          src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                          <p className="text-xs font-medium text-white leading-tight">{movie.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="grid gap-2 sm:gap-3 mb-6 sm:mb-8">
                {RESULT_BENEFITS.map((benefit, i) => {
                  const Icon = IconMap[benefit.icon];
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i}
                      className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl flex gap-3"
                    >
                      <div className="bg-purple-500/20 p-2 sm:p-2.5 rounded-xl h-fit">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base mb-0.5">{benefit.title}</h3>
                        <p className="text-gray-400 text-xs sm:text-sm">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('signup')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 sm:py-5 rounded-2xl text-base sm:text-xl shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02]"
              >
                Desbloquear Meu Perfil Completo
              </button>
            </motion.div>
          )}

          {/* SIGNUP SCREEN */}
          {step === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center pb-6 sm:pb-10"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_40px_rgba(168,85,247,0.3)] mb-4 sm:mb-6">
                <Lock className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
              </div>

              <h2 className="text-xl sm:text-3xl font-bold mb-2">Crie sua conta para desbloquear</h2>
              <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8 max-w-md">
                Quase lá! Crie uma senha para acessar seu perfil cinematográfico completo e todas as funcionalidades PRO.
              </p>

              <div className="w-full max-w-sm space-y-4 text-left">
                {/* Email field — pre-filled, read-only */}
                <div>
                  <label className="text-xs sm:text-sm text-gray-500 mb-1 block">E-mail</label>
                  <input
                    type="email"
                    value={answers.email || ''}
                    readOnly
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-white text-base sm:text-lg opacity-60 cursor-not-allowed"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label className="text-xs sm:text-sm text-gray-500 mb-1 block">Crie sua senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-white text-base sm:text-lg placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                    autoFocus
                    minLength={6}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && signupPassword.length >= 6) handleSignUp();
                    }}
                  />
                </div>

                <button
                  onClick={handleSignUp}
                  disabled={isSigningUp || signupPassword.length < 6}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSigningUp ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar Conta e Continuar <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Privacy note — NO login link */}
              <p className="mt-6 sm:mt-8 text-gray-600 text-xs max-w-xs">
                Seus dados estão seguros conosco. Criamos essa conta para que você possa acessar seu perfil a qualquer momento.
              </p>
            </motion.div>
          )}

          {/* PRICING SCREEN */}
          {step === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col pb-6 sm:pb-10"
            >
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">Escolha seu acesso Pro</h2>

                {/* Real Urgency - NO fake timer */}
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium text-xs sm:text-sm">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  Preço de lançamento válido para os primeiros {EARLY_BIRD_LIMIT} usuários
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
                {PRICING_PLANS.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-4 sm:p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'bg-purple-900/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Mais Popular
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1">{plan.name}</h3>
                        {plan.savings && (
                          <span className="text-green-400 text-xs sm:text-sm font-medium">{plan.savings}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-2xl font-bold">{plan.price}</div>
                        <div className="text-gray-500 text-xs sm:text-sm">{plan.period}</div>
                      </div>
                    </div>

                    <div className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPlan === plan.id ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                    }`}>
                      {selectedPlan === plan.id && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={isSubscribing}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 sm:py-5 rounded-2xl text-base sm:text-xl shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02] mb-4 sm:mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? 'Processando...' : 'Assinar Agora'}
              </button>

              {/* Guarantee & Trust */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm sm:text-base mb-1">Garantia de 7 Dias</h4>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Se você não sentir que economizou tempo e encontrou filmes melhores na primeira semana, devolvemos 100% do seu dinheiro. Sem perguntas.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex justify-center items-center gap-2 text-gray-500 text-xs sm:text-sm">
                <Lock className="w-3 h-3 sm:w-4 sm:h-4" /> Pagamento 100% Seguro via Stripe
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
