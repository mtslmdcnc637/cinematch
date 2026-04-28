/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Film } from 'lucide-react';
import { GENRES } from '../../constants';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'sonner';

interface OnboardingPageProps {
  selectedGenres: number[];
  toggleGenre: (id: number) => void;
  onContinue: () => void;
  onLogin: () => void;
  user: any;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authUsername: string;
  setAuthUsername: (username: string) => void;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  isAuthLoading: boolean;
  handleEmailAuth: (e: React.FormEvent) => void;
  handleGoogleAuth: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  selectedGenres,
  toggleGenre,
  onContinue,
  onLogin,
  user,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authUsername,
  setAuthUsername,
  isSignUp,
  setIsSignUp,
  isAuthLoading,
  handleEmailAuth,
  handleGoogleAuth,
}) => {
  const [step, setStep] = useState(user ? 1 : 0);

  const handleContinueWithGenres = async () => {
    if (user) {
      try {
        await supabaseService.updateProfile(user.id, { selectedGenres });
        onContinue();
      } catch (error) {
        toast.error('Erro ao salvar gêneros. Verifique o console para mais detalhes.');
      }
    } else {
      // Non-logged-in user must authenticate first
      toast.error('Crie sua conta primeiro para continuar.');
      onLogin();
    }
  };

  return (
    <AnimatePresence>
      {step === 0 ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12 px-4"
        >
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 rounded-full" />
            <div className="relative w-32 h-32 rounded-full glass-card flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-16 h-16 text-purple-400" />
            </div>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tighter font-display text-white">
            Nunca mais brigue para escolher um filme!
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            O MrCine ajuda você e seus amigos a descobrirem filmes que todo mundo vai amar. É fácil, divertido e acaba com a dúvida na hora de assistir algo novo.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12 w-full">
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <div className="text-3xl mb-4">🍿</div>
              <h3 className="font-bold text-lg mb-2">Descubra</h3>
              <p className="text-sm text-gray-400">Veja filmes que combinam com o seu gosto.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <div className="text-3xl mb-4">⭐</div>
              <h3 className="font-bold text-lg mb-2">Avalie</h3>
              <p className="text-sm text-gray-400">Diga o que achou e suba de nível!</p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="font-bold text-lg mb-2">Combine</h3>
              <p className="text-sm text-gray-400">A IA encontra o filme perfeito pro grupo.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setStep(1)}
              className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Criar minha conta
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSignUp(false);
                onLogin();
              }}
              className="group relative inline-flex items-center justify-center gap-3 bg-white/10 text-white px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 hover:bg-white/20 hover:scale-105"
            >
              Já tenho conta
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="onboarding-genres"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12"
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
            O que você curte?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Selecione pelo menos 3 gêneros para calibrarmos o nosso algoritmo e encontrarmos os filmes perfeitos para você.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {GENRES.map((genre, i) => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <motion.button
                  key={genre.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleGenre(genre.id)}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-full border backdrop-blur-md transition-all duration-300 ${
                    isSelected
                      ? 'bg-purple-600/80 text-white border-purple-400 shadow-[0_0_30px_rgba(147,51,234,0.4)]'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                  <span className="font-medium tracking-wide">{genre.name}</span>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleContinueWithGenres}
            disabled={selectedGenres.length < 3}
            className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Começar a Experiência
            <Film className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
