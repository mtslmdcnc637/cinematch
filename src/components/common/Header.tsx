/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clapperboard, Bell, Info } from 'lucide-react';
import { ProBadge } from './ProBadge';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  navItems: NavItem[];
  notifications: any[];
  setShowNotificationsModal: (show: boolean) => void;
  setShowHelpModal: (show: boolean) => void;
  isPro: boolean;
  userProfile: { xp: number; level: number; username?: string };
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  setCurrentPage,
  navItems,
  notifications,
  setShowNotificationsModal,
  setShowHelpModal,
  isPro,
  userProfile,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display">CineMatch</h1>
          {isPro && <ProBadge size="sm" />}
        </div>

        {currentPage !== 'onboarding' && (
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-white/10 border border-white/20 rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-purple-400' : ''}`} />
                      <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              onClick={() => setShowNotificationsModal(true)}
              className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
              title="Notificações"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {notifications.some(n => !n.is_read) && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
              title="Como funciona"
            >
              <Info className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
