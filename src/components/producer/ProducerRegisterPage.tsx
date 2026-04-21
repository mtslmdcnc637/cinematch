/**
 * ProducerRegisterPage — Redesigned self-registration page for MrCine Pro producers
 * 
 * Two modes:
 * - "Criar Conta" (new users): Full registration with email, password, username, etc.
 * - "Já tenho conta" (existing users): Login first, then fill in producer details
 * 
 * Key improvements:
 * - All text visible (white/light on dark background)
 * - Single account type: "Produtor MrCine"
 * - Floating FAQ/Help button
 * - Debounced username availability check
 * - Visual feedback everywhere (loading, validation, toasts)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Film,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AtSign,
  FileText,
  ArrowRight,
  ArrowLeft,
  Home,
  AlertCircle,
  Loader2,
  Check,
  X,
  Sparkles,
  DollarSign,
  BarChart3,
  Wallet,
  Link as LinkIcon,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle2,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

type RegistrationMode = 'new' | 'existing';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

interface FieldErrors {
  username?: string;
  displayName?: string;
  email?: string;
  password?: string;
  loginEmail?: string;
  loginPassword?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ─── Producer Pricing Constants ──────────────────────────────────────────────
// These must match the actual Stripe prices. Update when prices change.
const COMMISSION_RATE = 0.30; // 30%
const MONTHLY_PRICE = 9.00;   // R$9,00/month (matches Stripe price_1TMxyp4RL108qJ9NlRd9y92G)
const QUARTERLY_PRICE = 24.00; // R$24,00/3 months
const ANNUAL_PRICE = 69.00;   // R$69,00/year

const formatBRLValue = (v: number) => v.toFixed(2).replace('.', ',');

const PRODUCER_PRICING = {
  monthlyDisplay: formatBRLValue(MONTHLY_PRICE),
  quarterlyDisplay: formatBRLValue(QUARTERLY_PRICE),
  annualDisplay: formatBRLValue(ANNUAL_PRICE),
  commissionRate: '30%',
  monthlyCommission: formatBRLValue(MONTHLY_PRICE * COMMISSION_RATE),
  quarterlyCommission: formatBRLValue(QUARTERLY_PRICE * COMMISSION_RATE),
  annualCommission: formatBRLValue(ANNUAL_PRICE * COMMISSION_RATE),
  earnings10: formatBRLValue(MONTHLY_PRICE * COMMISSION_RATE * 10),
  earnings50: formatBRLValue(Math.round(MONTHLY_PRICE * COMMISSION_RATE * 50)),
  earnings100: formatBRLValue(MONTHLY_PRICE * COMMISSION_RATE * 100),
};

const FAQ_DATA: FAQItem[] = [
  {
    question: 'Como funciona?',
    answer: 'Voce compartilha seu link exclusivo. Quando alguem assina o MrCine Pro pelo seu link, voce recebe 30% da assinatura.',
  },
  {
    question: 'Quanto vou ganhar?',
    answer: `O plano mensal custa R$${PRODUCER_PRICING.monthlyDisplay}. Voce recebe R$${PRODUCER_PRICING.monthlyCommission} por assinatura mensal (30%). Planos trimestrais e anuais geram ainda mais.`,
  },
  {
    question: 'Como recebo os pagamentos?',
    answer: 'Voce conecta sua conta Stripe e recebe os pagamentos automaticamente.',
  },
  {
    question: 'Posso criar listas de filmes?',
    answer: 'Sim! Voce pode criar listas tematicas que aparecem no seu perfil publico.',
  },
  {
    question: 'Quanto custa?',
    answer: 'E gratuito! Voce so ganha, nao paga nada.',
  },
  {
    question: 'Preciso ter quantos seguidores?',
    answer: 'Nao ha minimo de seguidores. Qualquer pessoa pode ser produtor.',
  },
];

function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Media', color: 'bg-yellow-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
}

// ─── FAQ Modal Component ─────────────────────────────────────────────────────

function FAQModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setOpenIndex(null);
  }, [open]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-md max-h-[80vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            Perguntas Frequentes
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* FAQ Items */}
        <div className="p-4 space-y-2">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className="border border-white/5 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-medium text-white">{item.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-3 text-sm text-white/60 leading-relaxed">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Floating Help Button ────────────────────────────────────────────────────

function FloatingHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30 flex items-center justify-center text-white transition-all duration-300 hover:shadow-purple-500/50 hover:scale-110"
      aria-label="Ajuda"
    >
      <HelpCircle className="w-6 h-6" />
    </motion.button>
  );
}

// ─── Success Animation ───────────────────────────────────────────────────────

function SuccessCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
      className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 15 }}
      >
        <CheckCircle2 className="w-12 h-12 text-green-400" />
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProducerRegisterPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<RegistrationMode>('new');

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState('');

  // Username availability
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [loggedInToken, setLoggedInToken] = useState('');

  // Login form (for existing users mode)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Success state
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // FAQ modal
  const [showFAQ, setShowFAQ] = useState(false);

  // Check if already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsLoggedIn(true);
          setLoggedInEmail(session.user.email || '');
          setLoggedInToken(session.access_token);
        }
      } catch (err) {
        console.error('[Register] Session check error:', err);
      }
    };
    checkSession();
  }, []);

  // Debounced username check
  const checkUsername = useCallback(async (name: string) => {
    if (name.length < 3 || !/^[a-zA-Z0-9_]+$/.test(name)) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/producer/check-username/${name}`);
      if (!res.ok) {
        setUsernameAvailable(null);
        return;
      }
      const data = await res.json();
      setUsernameAvailable(data.available);
      if (!data.available) {
        if (data.reason === 'format') {
          setFieldErrors(prev => ({ ...prev, username: 'Username deve ter 3-20 caracteres alfanumericos' }));
        } else if (data.reason === 'profanity') {
          setFieldErrors(prev => ({ ...prev, username: 'Username contem linguagem inapropriada' }));
        } else {
          setFieldErrors(prev => ({ ...prev, username: 'Nome de usuario ja em uso' }));
        }
      } else {
        setFieldErrors(prev => ({ ...prev, username: undefined }));
      }
    } catch (err) {
      console.error('[Register] Username check error:', err);
      setUsernameAvailable(null);
      toast.error('Erro ao verificar username. Tente novamente.');
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  useEffect(() => {
    setUsernameChecking(true);
    const timer = setTimeout(() => {
      if (username) {
        checkUsername(username);
      } else {
        setUsernameChecking(false);
        setUsernameAvailable(null);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      setUsernameChecking(false);
    };
  }, [username, checkUsername]);

  const passwordStrength = checkPasswordStrength(password);

  // ─── Field Validation ────────────────────────────────────────────────────

  const validateNewAccount = (): boolean => {
    const errors: FieldErrors = {};

    if (!username) {
      errors.username = 'Username e obrigatorio';
    } else if (username.length < 3 || username.length > 20) {
      errors.username = 'Username deve ter 3-20 caracteres alfanumericos';
    } else if (usernameAvailable === false) {
      errors.username = 'Nome de usuario ja em uso';
    }

    if (!displayName) {
      errors.displayName = 'Nome de exibicao e obrigatorio';
    } else if (displayName.length < 2 || displayName.length > 50) {
      errors.displayName = 'Nome deve ter entre 2 e 50 caracteres';
    }

    if (!email) {
      errors.email = 'Email e obrigatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email invalido';
    }

    if (!password) {
      errors.password = 'Senha e obrigatoria';
    } else if (password.length < 8) {
      errors.password = 'Senha deve ter no minimo 8 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExistingAccount = (): boolean => {
    const errors: FieldErrors = {};

    if (!username) {
      errors.username = 'Username e obrigatorio';
    } else if (username.length < 3 || username.length > 20) {
      errors.username = 'Username deve ter 3-20 caracteres alfanumericos';
    } else if (usernameAvailable === false) {
      errors.username = 'Nome de usuario ja em uso';
    }

    if (!displayName) {
      errors.displayName = 'Nome de exibicao e obrigatorio';
    } else if (displayName.length < 2 || displayName.length > 50) {
      errors.displayName = 'Nome deve ter entre 2 e 50 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Handle login for existing users ─────────────────────────────────────

  const handleExistingUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!supabase) {
      setError('Servico de autenticacao indisponivel');
      return;
    }

    // Validate
    const errors: FieldErrors = {};
    if (!loginEmail) errors.loginEmail = 'Email e obrigatorio';
    if (!loginPassword) errors.loginPassword = 'Senha e obrigatoria';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        // Check if already a producer
        try {
          const producerRes = await fetch('/api/producer/me', {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (producerRes.ok) {
            toast.info('Voce ja e um produtor! Redirecionando...');
            navigate('/producer/dashboard', { replace: true });
            return;
          }
        } catch {
          // Not a producer yet, continue
        }

        setIsLoggedIn(true);
        setLoggedInEmail(data.session.user.email || '');
        setLoggedInToken(data.session.access_token);
        toast.success('Login realizado!');
      }
    } catch (err) {
      console.error('[Register] Login error:', err);
      setError('Erro de conexao. Tente novamente.');
      toast.error('Erro de conexao. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ─── Handle new user registration ────────────────────────────────────────

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateNewAccount()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/producer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          display_name: displayName,
          email,
          password,
          bio: bio || undefined,
          role: 'influencer', // Single role — Produtor MrCine
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || data.error || 'Erro ao criar conta.';
        setError(msg);
        toast.error(msg);

        // Set field-specific errors from server
        if (data.error?.includes('Username') || data.error?.includes('username')) {
          setFieldErrors(prev => ({ ...prev, username: data.message || 'Username indisponivel' }));
        }
        if (data.error?.includes('Email') || data.error?.includes('email')) {
          setFieldErrors(prev => ({ ...prev, email: data.message || 'Email ja cadastrado' }));
        }
        return;
      }

      setReferralCode(data.referral_code);
      setRegistrationSuccess(true);
      toast.success('Cadastro realizado com sucesso!', { duration: 5000 });
    } catch (err) {
      console.error('[Register] Error:', err);
      setError('Erro de conexao. Tente novamente.');
      toast.error('Erro de conexao. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handle existing user requesting access ──────────────────────────────

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateExistingAccount()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/producer/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loggedInToken}`,
        },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio: bio || undefined,
          role: 'influencer',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || data.error || 'Erro ao solicitar acesso.';
        setError(msg);
        toast.error(msg);
        return;
      }

      setReferralCode(data.referral_code);
      setRegistrationSuccess(true);
      toast.success('Acesso de produtor concedido!', { duration: 5000 });
    } catch (err) {
      console.error('[RequestAccess] Error:', err);
      setError('Erro de conexao. Tente novamente.');
      toast.error('Erro de conexao. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Input Field Helper ──────────────────────────────────────────────────

  const inputClass = (hasError?: string) =>
    `w-full bg-white/5 border ${hasError ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all`;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] selection:bg-purple-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>

        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
          className="relative z-10 max-w-md w-full mx-4 text-center"
        >
          <SuccessCheckmark />

          <h1 className="text-3xl font-bold mb-3 text-white">Cadastro Realizado!</h1>
          <p className="text-white/60 mb-6">
            Sua conta foi criada e aprovada automaticamente. Bem-vindo ao MrCine Pro!
          </p>

          {referralCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5 mb-6"
            >
              <p className="text-sm text-white/60 mb-2">Seu link exclusivo:</p>
              <p className="text-xl font-bold text-purple-300 font-mono tracking-wider break-all">
                mrcine.pro/p/{username}
              </p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 mb-1">Codigo de referral:</p>
                <p className="text-lg font-bold text-white/80 font-mono">{referralCode}</p>
              </div>
              <p className="text-xs text-white/40 mt-2">
                Compartilhe: mrcine.pro/?ref={referralCode}
              </p>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/producer/dashboard')}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center justify-center gap-2"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <button
              onClick={() => navigate('/')}
              className="text-white/40 hover:text-white text-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              <Home className="w-4 h-4" />
              Voltar ao site
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN STEP (existing users)
  // ═══════════════════════════════════════════════════════════════════════════

  if (mode === 'existing' && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] selection:bg-purple-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>

        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
        <FloatingHelpButton onClick={() => setShowFAQ(true)} />
        <FAQModal open={showFAQ} onClose={() => setShowFAQ(false)} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-sm w-full mx-4"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Film className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-white">
                MrCine<span className="text-purple-500">PRO</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-white">Ja tenho conta</h1>
            <p className="text-white/60 text-sm">Faca login para solicitar acesso como produtor</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <form onSubmit={handleExistingUserLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-1.5 font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (fieldErrors.loginEmail) setFieldErrors(prev => ({ ...prev, loginEmail: undefined }));
                    }}
                    placeholder="seu@email.com"
                    className={`${inputClass(fieldErrors.loginEmail)} pl-10`}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {fieldErrors.loginEmail && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.loginEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-1.5 font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (fieldErrors.loginPassword) setFieldErrors(prev => ({ ...prev, loginPassword: undefined }));
                    }}
                    placeholder="Sua senha"
                    className={`${inputClass(fieldErrors.loginPassword)} pl-10 pr-10`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.loginPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.loginPassword}
                  </p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => { setMode('new'); setError(null); setFieldErrors({}); }}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Criar uma nova conta
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-white/40 hover:text-white text-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              <Home className="w-4 h-4" />
              Voltar ao site
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN REGISTRATION FORM
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#030303] selection:bg-purple-500/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
      <FloatingHelpButton onClick={() => setShowFAQ(true)} />
      <FAQModal open={showFAQ} onClose={() => setShowFAQ(false)} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Film className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold text-white">
              MrCine<span className="text-purple-500">PRO</span>
            </span>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Torne-se um Produtor MrCine</h1>
          <p className="text-white/60 text-lg">Ganhe comissoes indicando o melhor de cinema</p>
        </div>

        <div className="grid md:grid-cols-5 gap-6 md:gap-8">
          {/* Left: Registration Form */}
          <div className="md:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              {/* Mode Toggle */}
              <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                <button
                  onClick={() => { setMode('new'); setError(null); setFieldErrors({}); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    mode === 'new'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Criar Conta
                </button>
                <button
                  onClick={() => { setMode('existing'); setError(null); setFieldErrors({}); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    mode === 'existing'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Ja tenho conta
                </button>
              </div>

              {/* Logged-in banner */}
              {mode === 'existing' && isLoggedIn && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-green-400"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  Logado como <strong>{loggedInEmail}</strong>
                </motion.div>
              )}

              {/* ─── Produtor MrCine Badge ─── */}
              <div className="mb-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Produtor MrCine</h3>
                    <p className="text-xs text-white/50">Tipo de conta unico</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Como Produtor MrCine, voce ganha 30% de comissao em cada assinatura gerada pelo seu link exclusivo.
                  Voce recebe um link personalizado (mrcine.pro/p/seunome) para compartilhar com sua audiencia.
                  Acompanhe cliques, conversoes e ganhos em tempo real no seu painel.
                  Receba pagamentos direto na sua conta via Stripe.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={mode === 'new' ? handleRegister : handleRequestAccess}
                className="space-y-5"
                noValidate
              >
                {/* Username */}
                <div>
                  <label className="block text-sm text-purple-300 mb-1.5 font-medium">
                    <AtSign className="w-4 h-4 inline mr-1" />
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                        setUsername(val);
                        if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: undefined }));
                      }}
                      placeholder="seu_username"
                      className={`${inputClass(fieldErrors.username)} pr-10 font-mono`}
                      autoFocus
                    />
                    {username.length >= 1 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameChecking ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                        ) : usernameAvailable === true ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : usernameAvailable === false ? (
                          <X className="w-4 h-4 text-red-400" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {fieldErrors.username && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.username}
                    </p>
                  )}
                  {!fieldErrors.username && username.length >= 3 && usernameAvailable === true && (
                    <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Username disponivel!
                    </p>
                  )}
                  {!fieldErrors.username && username.length > 0 && username.length < 3 && (
                    <p className="text-white/30 text-xs mt-1">3-20 caracteres, letras, numeros e underscore</p>
                  )}
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm text-purple-300 mb-1.5 font-medium">
                    <User className="w-4 h-4 inline mr-1" />
                    Nome de Exibicao
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value.slice(0, 50));
                      if (fieldErrors.displayName) setFieldErrors(prev => ({ ...prev, displayName: undefined }));
                    }}
                    placeholder="Seu nome publico"
                    className={inputClass(fieldErrors.displayName)}
                  />
                  {fieldErrors.displayName && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.displayName}
                    </p>
                  )}
                  <p className="text-white/30 text-xs mt-1">Como seu nome aparecera publicamente (2-50 caracteres)</p>
                </div>

                {/* Email (only for new accounts) */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm text-purple-300 mb-1.5 font-medium">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      placeholder="seu@email.com"
                      className={inputClass(fieldErrors.email)}
                      autoComplete="email"
                    />
                    {fieldErrors.email && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>
                )}

                {/* Password (only for new accounts) */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm text-purple-300 mb-1.5 font-medium">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        placeholder="Minimo 8 caracteres"
                        className={`${inputClass(fieldErrors.password)} pr-10`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                      </p>
                    )}
                    {/* Password strength indicator */}
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all ${
                                i <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-white/40">
                          Forca: <span className={
                            passwordStrength.label === 'Fraca' ? 'text-red-400' :
                            passwordStrength.label === 'Media' ? 'text-yellow-400' : 'text-green-400'
                          }>{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Bio */}
                <div>
                  <label className="block text-sm text-purple-300 mb-1.5 font-medium">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Bio <span className="text-white/30">(opcional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder="Conte um pouco sobre voce e seu conteudo..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                  />
                  <p className="text-white/30 text-xs mt-1">{bio.length}/500 caracteres</p>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  type="submit"
                  disabled={isSubmitting || usernameChecking || usernameAvailable === false}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      {mode === 'new' ? 'Criar Conta de Produtor' : 'Solicitar Acesso'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Back links */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => navigate('/producer/login')}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Ja sou produtor, fazer login
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-white/40 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar ao site
              </button>
            </div>
          </div>

          {/* Right: Info Section */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky top-8 space-y-4"
            >
              {/* Benefits */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Por que ser produtor?
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">Ganhe comissoes</p>
                      <p className="text-white/40 text-xs">Indique o MrCine Pro e ganhe 30% de cada assinatura gerada pelo seu link</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">Link personalizado</p>
                      <p className="text-white/40 text-xs">Receba mrcine.pro/p/seunome para compartilhar com sua audiencia</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">Acompanhe seus resultados</p>
                      <p className="text-white/40 text-xs">Veja cliques, conversoes e ganhos em tempo real no dashboard</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-fuchsia-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">Receba pagamentos</p>
                      <p className="text-white/40 text-xs">Receba direto na sua conta via Stripe Connect</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">Crie listas de filmes</p>
                      <p className="text-white/40 text-xs">Monte curadorias personalizadas com seus filmes favoritos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 text-white">Como funciona?</h2>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-400">1</div>
                    <p className="text-sm text-white/70">Cadastre-se e receba seu link de referral exclusivo</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-400">2</div>
                    <p className="text-sm text-white/70">Compartilhe com seu publico e redes sociais</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-400">3</div>
                    <p className="text-sm text-white/70">Ganhe 30% de cada assinatura que vier do seu link</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-400">4</div>
                    <p className="text-sm text-white/70">Receba seus ganhos direto na sua conta bancaria</p>
                  </div>
                </div>
              </div>

              {/* Trust */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 text-white/50">
                  <Shield className="w-5 h-5 text-green-400 shrink-0" />
                  <p className="text-xs">Seus dados sao protegidos e processados com seguranca. Aprovacao automatica — comece a ganhar imediatamente.</p>
                </div>
              </div>

              {/* Earnings Preview */}
              <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Simulador de ganhos</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-bold text-white">R${PRODUCER_PRICING.monthlyCommission}</p>
                    <p className="text-[10px] text-white/40">por assinatura mensal</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-bold text-white">R${PRODUCER_PRICING.earnings10}</p>
                    <p className="text-[10px] text-white/40">com 10 assinaturas</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-bold text-white">R${PRODUCER_PRICING.earnings50}</p>
                    <p className="text-[10px] text-white/40">com 50 assinaturas</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-lg font-bold text-white">R${PRODUCER_PRICING.earnings100}</p>
                    <p className="text-[10px] text-white/40">com 100 assinaturas</p>
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-3 text-center">Baseado no plano mensal de R${PRODUCER_PRICING.monthlyDisplay} com 30% de comissao</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
