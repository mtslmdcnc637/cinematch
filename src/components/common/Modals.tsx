/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Film, Star, Bot, Library, Trophy } from 'lucide-react';
import { isLeagueTransition, getLeagueForLevel, LEAGUES } from '../../constants';

/* ──────────── Level Up Modal ──────────── */

interface LevelUpModalProps {
  show: boolean;
  levelData: any | null;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ show, levelData, onClose }) => {
  const isLeagueUp = levelData ? isLeagueTransition(levelData.level) : false;
  const league = levelData ? getLeagueForLevel(levelData.level) : null;

  return (
  <AnimatePresence>
    {show && levelData && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, y: 100, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={`relative w-full max-w-sm glass-card rounded-[3rem] p-8 text-center border overflow-hidden ${
            isLeagueUp ? 'border-amber-400/50' : 'border-white/20'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${levelData.color} ${isLeagueUp ? 'opacity-30' : 'opacity-20'}`} />

          {/* League transition special banner */}
          {isLeagueUp && league && (
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 mb-4 bg-white/10 border border-amber-400/30 rounded-2xl px-4 py-2 flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5 text-amber-300" />
              <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                Nova Liga: {league.icon} {league.name}
              </span>
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 15 }}
            className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${levelData.color} flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(255,255,255,0.3)] mb-6 relative z-10`}
          >
            {levelData.icon}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10"
          >
            <p className="text-gray-300 font-medium uppercase tracking-widest text-sm mb-2">
              Você subiu para o Nível {levelData.level}!
            </p>
            <h2 className="text-4xl font-bold font-display mb-2 text-white">{levelData.name}</h2>

            {/* Show league multiplier info on league transition */}
            {isLeagueUp && league && league.xpMultiplier > 1 && (
              <p className="text-amber-300 font-bold text-sm mb-4">
                Agora você ganha {league.xpMultiplier}x XP em todas as ações!
              </p>
            )}

            {!isLeagueUp && (
              <p className="text-gray-400 mb-8">Continue avaliando filmes para desbloquear novas conquistas.</p>
            )}

            <button
              onClick={onClose}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-105 transition-transform"
            >
              {isLeagueUp ? 'Vamos lá!' : 'Incrível!'}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  );
};

/* ──────────── Notifications Modal ──────────── */

interface NotificationsModalProps {
  show: boolean;
  notifications: any[];
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ show, notifications, onClose }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Notificações</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-400">Nenhuma notificação.</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border ${n.is_read ? 'bg-white/5 border-white/10' : 'bg-purple-900/20 border-purple-500/30'}`}
              >
                <p className="text-white">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

/* ──────────── Help Modal ──────────── */

interface HelpModalProps {
  show: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ show, onClose }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl glass-card rounded-[2rem] p-8 md:p-10 text-left border border-white/20 my-8"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold font-display text-white">Como funciona?</h2>
              <p className="text-gray-400">O guia definitivo do MrCine</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
              <div className="mt-1"><Film className="w-6 h-6 text-purple-400" /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">O Feed Infinito</h3>
                <p className="text-gray-300 leading-relaxed">
                  Descubra filmes baseados nos seus gêneros favoritos. Avalie como <strong>Amei</strong>, <strong>Gostei</strong> ou <strong>Não Gostei</strong> para treinar o seu perfil, ou salve para <strong>Ver Depois</strong>.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
              <div className="mt-1"><Star className="w-6 h-6 text-amber-400" /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Sistema de Níveis & Ligas</h3>
                <p className="text-gray-300 leading-relaxed">
                  Cada avaliação rende experiência (XP). Suba de nível e evolua de um simples <em>Novato</em> para <em>O Último Frame</em>! São 30 níveis divididos em 5 Ligas, cada uma com multiplicador de XP crescente.
                  <br /><span className="text-sm text-gray-400 mt-2 block">Amei: +20 XP | Gostei: +10 XP | Não Gostei: +5 XP</span>
                  <span className="text-sm text-amber-300 mt-1 block">Ligas: Iniciante (1.0x) → Cinéfilo (1.1x) → Estrela (1.2x) → Lenda (1.3x) → Cósmica (1.5x)</span>
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
              <div className="mt-1"><Bot className="w-6 h-6 text-emerald-400" /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Oráculo de IA</h3>
                <p className="text-gray-300 leading-relaxed">
                  Vai assistir com os amigos e não conseguem decidir? Vá na aba <strong>Amigos</strong>, selecione com quem vai assistir e clique em <em>Exportar para IA</em>. Cole o texto no ChatGPT ou Gemini e deixe a inteligência artificial encontrar o filme perfeito que agrada a todos!
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex gap-4">
              <div className="mt-1"><Library className="w-6 h-6 text-blue-400" /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Sua Biblioteca na Nuvem</h3>
                <p className="text-gray-300 leading-relaxed">
                  Crie uma conta para salvar automaticamente todas as suas avaliações, níveis e lista de "Ver Depois" na nuvem. Acesse de qualquer dispositivo sem perder nada.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={onClose}
              className="bg-white text-black font-bold py-4 px-10 rounded-full hover:scale-105 transition-transform"
            >
              Entendi, vamos lá!
            </button>
          </div>
        </motion.div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ──────────── Export Modal (generic — used in Friends for group export) ──────────── */

interface ExportModalProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ExportModal: React.FC<ExportModalProps> = ({ show, onClose, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#1a1a2e] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
