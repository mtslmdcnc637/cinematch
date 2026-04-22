/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, ChevronRight } from 'lucide-react';

interface AppInstallBannerProps {
  isPro: boolean;
}

export const AppInstallBanner: React.FC<AppInstallBannerProps> = ({ isPro }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed the banner recently (within 7 days)
    const dismissedAt = localStorage.getItem('mrcine_apk_banner_dismissed');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        setIsDismissed(true);
        return;
      }
    }

    // Show banner only for Pro users, with a small delay for better UX
    if (isPro) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isPro]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('mrcine_apk_banner_dismissed', Date.now().toString());
  };

  const handleDownload = () => {
    // Track the download event
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'apk_download', { event_category: 'app_install' });
      }
    } catch {}
    window.open('/MrCine.apk', '_blank');
  };

  if (!isPro || isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40"
        >
          <div className="relative bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>

            <div className="flex items-start gap-3">
              {/* App icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  MrCine no seu Android
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold">
                    PRO
                  </span>
                </h3>
                <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                  Baixe o app e leve o MrCine Pro no bolso. Acesso rápido, notificações push e experiência nativa.
                </p>

                <button
                  onClick={handleDownload}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-purple-900 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Baixar APK
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <p className="text-[10px] text-purple-300/40 mt-1.5 text-center">
                  v1.1.0 &middot; 85 KB &middot; Android 5+
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
