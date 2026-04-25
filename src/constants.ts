export const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const GENRES = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Terror' },
  { id: 878, name: 'Ficção Científica' },
  { id: 10749, name: 'Romance' },
  { id: 16, name: 'Animação' },
  { id: 99, name: 'Documentário' },
  { id: 53, name: 'Suspense' },
  { id: 14, name: 'Fantasia' },
];

// ─── Leagues (5 Ligas de 6 níveis cada) ───

export const LEAGUES = [
  { id: 'iniciante', name: 'Liga Iniciante', minLevel: 1, maxLevel: 6, icon: '🎬', color: 'from-gray-500 to-gray-400', xpMultiplier: 1.0 },
  { id: 'cinefilo', name: 'Liga Cinéfilo', minLevel: 7, maxLevel: 12, icon: '🎥', color: 'from-purple-500 to-violet-400', xpMultiplier: 1.1 },
  { id: 'estrela', name: 'Liga Estrela', minLevel: 13, maxLevel: 18, icon: '⭐', color: 'from-yellow-400 to-amber-300', xpMultiplier: 1.2 },
  { id: 'lenda', name: 'Liga Lenda', minLevel: 19, maxLevel: 24, icon: '🏛️', color: 'from-violet-400 to-purple-300', xpMultiplier: 1.3 },
  { id: 'cosmica', name: 'Liga Cósmica', minLevel: 25, maxLevel: 30, icon: '🌌', color: 'from-fuchsia-500 to-purple-800', xpMultiplier: 1.5 },
];

// ─── 30 Levels ───

export const LEVELS = [
  // Liga Iniciante (1.0x)
  { level: 1,  name: 'Novato',                  xpRequired: 0,     icon: '🌱', color: 'from-gray-500 to-gray-400' },
  { level: 2,  name: 'Curioso',                 xpRequired: 30,    icon: '👀', color: 'from-stone-500 to-stone-400' },
  { level: 3,  name: 'Pipoca de Microondas',     xpRequired: 80,    icon: '🍿', color: 'from-yellow-600 to-amber-400' },
  { level: 4,  name: 'Espectador Casual',        xpRequired: 150,   icon: '🛋️', color: 'from-blue-500 to-cyan-400' },
  { level: 5,  name: 'Frequentador de Cinema',   xpRequired: 250,   icon: '🎫', color: 'from-emerald-500 to-green-400' },
  { level: 6,  name: 'Aspirante a Cinéfilo',     xpRequired: 400,   icon: '📽️', color: 'from-teal-500 to-teal-400' },
  // Liga Cinéfilo (1.1x)
  { level: 7,  name: 'Crítico de Sofá',          xpRequired: 600,   icon: '🧐', color: 'from-purple-500 to-violet-400' },
  { level: 8,  name: 'Cinéfilo de Carteirinha',  xpRequired: 850,   icon: '🎬', color: 'from-pink-500 to-rose-400' },
  { level: 9,  name: 'Conhecedor',               xpRequired: 1150,  icon: '🎓', color: 'from-indigo-500 to-blue-500' },
  { level: 10, name: 'Roteirista Amador',        xpRequired: 1500,  icon: '✍️', color: 'from-orange-500 to-red-400' },
  { level: 11, name: 'Diretor de Domínio',       xpRequired: 1900,  icon: '🎥', color: 'from-violet-500 to-purple-600' },
  { level: 12, name: 'Mestre das Críticas',      xpRequired: 2400,  icon: '📝', color: 'from-amber-600 to-yellow-400' },
  // Liga Estrela (1.2x)
  { level: 13, name: 'Estrela em Ascensão',      xpRequired: 3000,  icon: '⭐', color: 'from-yellow-400 to-amber-300' },
  { level: 14, name: 'Produtor de Ouro',         xpRequired: 3700,  icon: '🏆', color: 'from-yellow-500 to-yellow-300' },
  { level: 15, name: 'Lenda de Hollywood',       xpRequired: 4500,  icon: '🌟', color: 'from-amber-400 to-orange-300' },
  { level: 16, name: 'Ícone do Cinema',          xpRequired: 5400,  icon: '💎', color: 'from-cyan-400 to-blue-300' },
  { level: 17, name: 'Visionário',               xpRequired: 6500,  icon: '🦅', color: 'from-rose-400 to-pink-300' },
  { level: 18, name: 'Magnata do Cinema',        xpRequired: 7800,  icon: '👑', color: 'from-yellow-300 to-amber-200' },
  // Liga Lenda (1.3x)
  { level: 19, name: 'Imortal da Sétima Arte',   xpRequired: 9300,  icon: '🏛️', color: 'from-emerald-400 to-green-300' },
  { level: 20, name: 'Oráculo dos Filmes',       xpRequired: 11000, icon: '🔮', color: 'from-violet-400 to-purple-300' },
  { level: 21, name: 'Arquiteto de Roteiros',    xpRequired: 13000, icon: '⚡', color: 'from-blue-400 to-indigo-300' },
  { level: 22, name: 'Cineasta Supremo',         xpRequired: 15500, icon: '🎭', color: 'from-red-400 to-rose-300' },
  { level: 23, name: 'Guardião da Película',     xpRequired: 18500, icon: '🛡️', color: 'from-teal-400 to-cyan-300' },
  { level: 24, name: 'Entidade Cinematográfica', xpRequired: 22000, icon: '🌌', color: 'from-fuchsia-500 to-purple-800' },
  // Liga Cósmica (1.5x)
  { level: 25, name: 'Além da Tela',             xpRequired: 26000, icon: '🕳️', color: 'from-gray-300 to-gray-100', animated: true },
  { level: 26, name: 'Transcendente',            xpRequired: 31000, icon: '🌀', color: 'from-indigo-400 to-violet-300', animated: true },
  { level: 27, name: 'Cronista do Infinito',     xpRequired: 37000, icon: '♾️', color: 'from-purple-400 to-pink-300', animated: true },
  { level: 28, name: 'Tecelão de Enredos',       xpRequired: 44000, icon: '🕸️', color: 'from-rose-400 to-red-300', animated: true },
  { level: 29, name: 'Deus do Cinema',           xpRequired: 53000, icon: '👁️', color: 'from-yellow-300 to-white', animated: true },
  { level: 30, name: 'O Último Frame',           xpRequired: 65000, icon: '🎞️', color: 'rainbow', animated: true },
];

// ─── Utility Functions ───

/** Get the league for a given level */
export function getLeagueForLevel(level: number) {
  return LEAGUES.find(l => level >= l.minLevel && level <= l.maxLevel) || LEAGUES[0];
}

/** Check if level is the first of a new league (7, 13, 19, 25) */
export function isLeagueTransition(level: number): boolean {
  return [7, 13, 19, 25].includes(level);
}

/** Calculate effective XP with league multiplier and PRO bonus */
export function calculateEffectiveXP(baseXP: number, userLevel: number, isPRO: boolean): number {
  const league = getLeagueForLevel(userLevel);
  const leagueMultiplier = league.xpMultiplier;
  const proMultiplier = isPRO ? 1.25 : 1.0;
  return Math.floor(baseXP * leagueMultiplier * proMultiplier);
}

/** Find the highest level reached for a given XP total (cascade fix) */
export function getLevelForXP(xp: number): number {
  const reachedLevelIndex = LEVELS.slice().reverse().findIndex(l => xp >= l.xpRequired);
  return reachedLevelIndex !== -1
    ? LEVELS[LEVELS.length - 1 - reachedLevelIndex].level
    : 1;
}
