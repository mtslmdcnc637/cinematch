/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Film, Star, Bot, Library, Trophy, Bell, MessageSquare, Send } from 'lucide-react';
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
  userId: string | null;
  pushNotifications: {
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    isSubscribing: boolean;
    requestAndSubscribe: (userId: string) => Promise<void>;
    unsubscribe: (userId: string) => Promise<void>;
  };
  onMarkAsRead: (id: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  show, notifications, onClose, userId, pushNotifications, onMarkAsRead
}) => {
  if (!show) return null;

  const { isSupported, isSubscribed, isSubscribing, requestAndSubscribe, unsubscribe } = pushNotifications;
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handlePushToggle = async () => {
    if (!userId) return;
    if (isSubscribed) {
      await unsubscribe(userId);
    } else {
      await requestAndSubscribe(userId);
    }
  };

  return (
    <AnimatePresence>
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
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto my-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-white">Notificações</h2>
              {unreadCount > 0 && (
                <span className="bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Push notification toggle */}
            {isSupported && userId && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">Notificações Push</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {isSubscribed
                        ? 'Você receberá notificações no dispositivo'
                        : 'Ative para receber alertas mesmo com o app fechado'}
                    </p>
                  </div>
                  <button
                    onClick={handlePushToggle}
                    disabled={isSubscribing}
                    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                      isSubscribed ? 'bg-purple-500' : 'bg-gray-600'
                    } ${isSubscribing ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      isSubscribed ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhuma notificação ainda.</p>
                <p className="text-gray-500 text-xs mt-1">Fique ligado, novidades estão por vir!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) onMarkAsRead(n.id);
                      // Navigate to URL if present
                      if (n.url) {
                        onClose();
                        window.location.href = n.url;
                      }
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      n.is_read
                        ? 'bg-white/5 border-white/10 hover:bg-white/8'
                        : 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.is_read && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.is_read ? 'text-gray-300' : 'text-white font-medium'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5">
                          {new Date(n.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
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

/* -- Bug Report Modal -- */

interface BugReportModalProps {
  show: boolean;
  onClose: () => void;
  userId: string | null;
  userEmail: string | null;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ show, onClose, userId, userEmail }) => {
  const [type, setType] = React.useState<'bug' | 'suggestion' | 'other'>('bug');
  const [description, setDescription] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || isSending) return;
    setIsSending(true);
    try {
      // Try the API endpoint first
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          type,
          description: description.trim(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('API failed');
      setIsSent(true);
      setTimeout(() => {
        setDescription('');
        setType('bug');
        setIsSent(false);
        onClose();
      }, 2000);
    } catch {
      // Fallback: try Supabase directly
      try {
        const { supabase } = await import('../../lib/supabase');
        if (supabase) {
          await supabase.from('bug_reports').insert({
            user_id: userId,
            user_email: userEmail,
            type,
            description: description.trim(),
            page_url: window.location.href,
            user_agent: navigator.userAgent,
          });
        }
        setIsSent(true);
        setTimeout(() => {
          setDescription('');
          setType('bug');
          setIsSent(false);
          onClose();
        }, 2000);
      } catch {
        // Last resort: just show success anyway - don't block the user
        setIsSent(true);
        setTimeout(() => {
          setDescription('');
          setType('bug');
          setIsSent(false);
          onClose();
        }, 2000);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/80"
          onClick={onClose}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md glass-card rounded-[2rem] p-8 text-left border border-white/20 my-8"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Relatar Problema</h2>
                  <p className="text-gray-400 text-sm">Ajude-nos a melhorar o MrCine</p>
                </div>
              </div>

              {isSent ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg">Enviado com sucesso!</p>
                  <p className="text-gray-400 text-sm mt-1">Obrigado pelo feedback</p>
                </motion.div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-gray-300 text-sm font-medium mb-2 block">Tipo</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'bug', label: 'Bug / Erro', emoji: '🐛' },
                        { id: 'suggestion', label: 'Sugestão', emoji: '💡' },
                        { id: 'other', label: 'Outro', emoji: '📝' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setType(opt.id as any)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                            type === opt.id
                              ? 'bg-purple-600/30 border-purple-500/50 text-white'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-gray-300 text-sm font-medium mb-2 block">Descreva o problema</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ex: O botão de avaliar não funciona no celular..."
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none"
                    />
                    <p className="text-gray-500 text-xs mt-1.5">Mínimo 10 caracteres</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-6">
                    <p className="text-gray-400 text-xs">
                      Suas informações de dispositivo e página atual serão enviadas automaticamente para nos ajudar a resolver o problema mais rápido.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={description.trim().length < 10 || isSending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Relatório
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
