/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Sparkles } from 'lucide-react';

interface OracleModalProps {
  show: boolean;
  onClose: () => void;
  result: string | null;
  isLoading: boolean;
}

export const OracleModal: React.FC<OracleModalProps> = ({
  show,
  onClose,
  result,
  isLoading,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#111] border border-emerald-500/30 rounded-[2rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 pointer-events-none" />

            <button
              onClick={() => onClose()}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 z-20"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>

            <div className="text-center relative z-10 flex-shrink-0">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Bot className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 font-display">Oráculo de IA</h3>
            </div>

            <div className="relative z-10 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Sparkles className="w-10 h-10 text-emerald-400 animate-spin-slow mb-4" />
                  <p className="text-gray-400">O Oráculo está analisando seu perfil...</p>
                </div>
              ) : result ? (
                <div className="text-gray-300 text-sm text-left bg-black/40 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                  {result}
                </div>
              ) : null}
            </div>

            <div className="mt-6 relative z-10 flex-shrink-0">
              <button
                onClick={() => onClose()}
                className="w-full py-4 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
