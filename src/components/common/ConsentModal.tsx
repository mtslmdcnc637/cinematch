/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

/* ──────────── Types ──────────── */

interface ConsentModalProps {
  show: boolean;
  userId: string;
  onAccept: () => void;
}

interface ConsentItem {
  id: string;
  label: string;
  linkText: string;
  linkTo: string;
  required: boolean;
  description: string;
}

/* ──────────── Consent items definition ──────────── */

const CONSENT_ITEMS: ConsentItem[] = [
  {
    id: 'terms',
    label: 'Aceito os',
    linkText: 'Termos de Uso',
    linkTo: '/terms',
    required: true,
    description: 'Obrigatório para usar a plataforma',
  },
  {
    id: 'privacy',
    label: 'Aceito a',
    linkText: 'Política de Privacidade',
    linkTo: '/privacy',
    required: true,
    description: 'Obrigatório para usar a plataforma',
  },
  {
    id: 'marketing',
    label: 'Aceito receber',
    linkText: 'comunicações e novidades',
    linkTo: '',
    required: false,
    description: 'Opcional — você pode alterar depois',
  },
  {
    id: 'data_collection',
    label: 'Autorizo a',
    linkText: 'coleta de dados para personalização',
    linkTo: '',
    required: false,
    description: 'Opcional — recomendações melhores',
  },
];

/* ──────────── ConsentModal Component ──────────── */

export const ConsentModal: React.FC<ConsentModalProps> = ({ show, userId, onAccept }) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    marketing: false,
    data_collection: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredAccepted = consents.terms && consents.privacy;

  const toggleConsent = (id: string) => {
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAccept = async () => {
    if (!requiredAccepted || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (supabase) {
        const { error } = await supabase.from('user_consents').upsert(
          [
            { user_id: userId, consent_type: 'terms', granted: consents.terms },
            { user_id: userId, consent_type: 'privacy', granted: consents.privacy },
            { user_id: userId, consent_type: 'marketing', granted: consents.marketing },
            { user_id: userId, consent_type: 'data_collection', granted: consents.data_collection },
          ],
          { onConflict: 'user_id, consent_type' }
        );

        if (error) throw error;
      }

      toast.success('Preferências de consentimento salvas!');
      onAccept();
    } catch (err: any) {
      console.error('Error saving consents:', err);
      toast.error('Erro ao salvar consentimentos. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md glass-card rounded-[2.5rem] p-8 md:p-10 text-center border border-white/20 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-500/5 pointer-events-none" />

            {/* Shield icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="relative z-10 w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] mb-6"
            >
              <ShieldCheck className="w-10 h-10 text-white" />
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10"
            >
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-3">
                Seu consentimento importa
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), precisamos da sua autorização
                para coletar e processar seus dados. Revise e aceite os termos abaixo para continuar.
              </p>
            </motion.div>

            {/* Consent checkboxes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative z-10 space-y-3 mb-8"
            >
              {CONSENT_ITEMS.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer group ${
                    consents[item.id]
                      ? 'bg-purple-500/15 border-purple-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                  onClick={() => toggleConsent(item.id)}
                >
                  {/* Custom checkbox */}
                  <div
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      consents[item.id]
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-500 group-hover:border-gray-400'
                    }`}
                  >
                    {consents[item.id] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>

                  {/* Label text */}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm text-gray-200">
                      {item.label}{' '}
                      {item.linkTo ? (
                        <Link
                          to={item.linkTo}
                          onClick={e => e.stopPropagation()}
                          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-purple-300/60 transition-colors"
                        >
                          {item.linkText}
                        </Link>
                      ) : (
                        <span className="text-gray-200">{item.linkText}</span>
                      )}
                      {item.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Accept button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative z-10"
            >
              <button
                onClick={handleAccept}
                disabled={!requiredAccepted || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 ${
                  requiredAccepted && !isSubmitting
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-[0.98]'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Salvando...
                  </span>
                ) : (
                  'Aceitar e Continuar'
                )}
              </button>

              {!requiredAccepted && (
                <p className="text-xs text-gray-500 mt-3">
                  Aceite os Termos de Uso e a Política de Privacidade para continuar
                </p>
              )}
            </motion.div>

            {/* LGPD rights footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="relative z-10 mt-6 pt-4 border-t border-white/5"
            >
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Lei Geral de Proteção de Dados (LGPD) — Você pode exercer seus direitos de acesso,
                correção, exclusão ou portabilidade dos seus dados a qualquer momento através das
                configurações da sua conta ou entrando em contato conosco.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConsentModal;
