/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Movie } from '../../types';

interface WhereToWatchProps {
  movieId: number;
  providers: Record<number, any>;
}

export const WhereToWatch: React.FC<WhereToWatchProps> = ({ movieId, providers }) => {
  const providerData = providers[movieId];
  if (!providerData) return null;

  const flatrate = providerData.flatrate || [];

  return (
    <div className="absolute top-14 left-0 bg-black/90 p-3 rounded-lg text-white text-xs w-56 z-20 border border-white/10 shadow-xl">
      <p className="font-bold mb-2 text-purple-400">Onde assistir:</p>
      {flatrate.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {flatrate.map((p: any) => (
            <div key={p.provider_id} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
              {p.logo_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                  alt={p.provider_name}
                  className="w-5 h-5 rounded-sm object-cover"
                />
              )}
              <span className="text-[11px] text-gray-300">{p.provider_name}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-gray-500">Indisponível em streaming no momento</span>
      )}
    </div>
  );
};
