/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'text-[9px] px-1.5 py-0.5 gap-0.5',
  md: 'text-[10px] px-2 py-0.5 gap-1',
  lg: 'text-xs px-3 py-1 gap-1.5',
};

const iconSizeClasses: Record<string, string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

export const ProBadge: React.FC<ProBadgeProps> = ({ size = 'md', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black rounded-full ${sizeClasses[size]} ${className}`}
    >
      <Crown className={iconSizeClasses[size]} />
      PRO
    </span>
  );
};

/**
 * Renders a golden border decoration for profile avatars when user is PRO.
 */
export const ProAvatarBorder: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-full p-1 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] ${className}`}
    >
      {children}
      <div className="absolute -bottom-1 -right-1">
        <ProBadge size="sm" />
      </div>
    </div>
  );
};
