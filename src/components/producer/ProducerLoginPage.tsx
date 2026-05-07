/**
 * ProducerLoginPage — Login page for MrCine Pro producers
 * 
 * Allows producers to authenticate with email + password via Supabase,
 * then verifies they have a producer profile before redirecting to the dashboard.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Film,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Home,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ProducerLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If already logged in + is producer, redirect to dashboard
  useEffect(() => {
    const checkSession = async () => {
      setIsCheckingSession(true);
      if (!supabase) { setIsCheckingSession(false); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const res = await fetch('/api/producer/me', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            });
            if (res.ok) {
              navigate('/producer/dashboard', { replace: true });
              return;
            }
          } catch {
            // Not a producer, stay on login page
          }
        }
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    if (!supabase) {
      setError('Serviço de autenticação indisponível');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Confirme seu email antes de fazer login');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.session) {
        setError('Erro ao criar sessão. Tente novamente.');
        return;
      }

      // Step 2: Check if user is a producer
      const producerRes = await fetch('/api/producer/me', {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!producerRes.ok) {
        // Not a producer — sign out and show error
        await supabase.auth.signOut();
        if (producerRes.status === 404) {
          const msg = 'Esta conta não está vinculada a um perfil de produtor';
          setError(msg);
          toast.error(msg);
        } else {
          const msg = 'Erro ao verificar perfil de produtor. Tente novamente.';
          setError(msg);
          toast.error(msg);
        }
        return;
      }

      // Success — redirect to dashboard
      toast.success('Login realizado com sucesso!');
      navigate('/producer/dashboard', { replace: true });
    } catch (err) {
      console.error('[ProducerLogin] Error:', err);
      setError('Erro de conexão. Tente novamente.');
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030303] selection:bg-purple-500/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />

      {/* Session check loading overlay */}
      {isCheckingSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030303]/90 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-gray-400 font-medium">Verificando sessão...</p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 max-w-sm w-full mx-4"
      >
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Film className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">
              MrCine<span className="text-purple-500">PRO</span>
            </span>
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Painel do Produtor</h1>
          <p className="text-gray-400 text-sm">Acesse seu dashboard de produtor</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 pr-10 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
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
            </button>
          </form>
        </div>

        {/* Registration link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/producer/register')}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Ainda não é produtor? Cadastre-se
          </button>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-white text-sm flex items-center gap-1.5 mx-auto transition-colors"
          >
            <Home className="w-4 h-4" />
            Voltar ao site
          </button>
        </div>
      </motion.div>
    </div>
  );
}
