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

// ─── XP Sources (v3) ────────────────────────────────────────
export const XP_SOURCES = {
  RATING_LOVED: 20,
  RATING_LIKED: 10,
  RATING_DISLIKED: 5,
  DAILY_LOGIN: 5,
  STREAK_BONUS_7: 15,
  STREAK_BONUS_30: 50,
  STREAK_BONUS_100: 150,
  GENRE_SPECIALIST: 25,
  SECRET_CODE: 30,
  MILESTONE_RATINGS_10: 50,
  MILESTONE_RATINGS_50: 150,
  MILESTONE_RATINGS_100: 300,
  MILESTONE_RATINGS_500: 1000,
  SHARE_MOVIE: 3,
  WATCHLIST_ADD: 2,
  CHALLENGE_DAILY: 15,
  CHALLENGE_WEEKLY: 50,
  CHALLENGE_MONTHLY: 150,
};

// ─── Soft Cap (v3) ─────────────────────────────────────────
export const DAILY_XP_SOFT_CAP = {
  FREE_FULL_XP_RATINGS: 20,       // 1-20 ratings: 100% XP
  FREE_REDUCED_UNTIL: 50,         // 21-50 ratings: 50% XP
  FREE_REDUCED_MULTIPLIER: 0.5,   // 
  PRO_FULL_XP_RATINGS: 30,        // PRO: 1-30 ratings: 100% XP
  PRO_REDUCED_UNTIL: 60,          // PRO: 31-60 ratings: 50% XP
  PRO_REDUCED_MULTIPLIER: 0.5,
} as const;

// ─── Streak Config ──────────────────────────────────────────
export const STREAK_CONFIG = {
  GRACE_HOURS: 48,         // Hours before streak breaks
  FREEZE_COST_PRO: 1,      // PRO users get 1 freeze per week
  FREEZE_MAX: 3,           // Max freezes per month
  BONUS_DAYS: [7, 30, 100, 365],  // Days that give bonus XP
  BONUS_XP: [15, 50, 150, 500],   // Corresponding XP bonuses
} as const;

// ─── Achievement Definitions (v3) ──────────────────────────
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type AchievementCategory = 'ratings' | 'genres' | 'streaks' | 'social' | 'collection' | 'leagues' | 'codes';

export interface AchievementTierDef {
  tier: AchievementTier;
  requirement: number;
  icon: string;
  xpReward: number;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  tiers: AchievementTierDef[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Ratings ──
  {
    id: 'first_rating', category: 'ratings', name: 'Primeira Avaliação',
    description: 'Avalie seu primeiro filme',
    tiers: [{ tier: 'bronze', requirement: 1, icon: '🎬', xpReward: 10 }],
  },
  {
    id: 'rating_milestone', category: 'ratings', name: 'Maratona Cinematográfica',
    description: 'Avalie filmes para alcançar marcos',
    tiers: [
      { tier: 'bronze', requirement: 10, icon: '🍿', xpReward: 50 },
      { tier: 'silver', requirement: 50, icon: '🎞️', xpReward: 150 },
      { tier: 'gold', requirement: 100, icon: '🏆', xpReward: 300 },
      { tier: 'diamond', requirement: 500, icon: '💎', xpReward: 1000 },
    ],
  },
  {
    id: 'loved_master', category: 'ratings', name: 'Amante do Cinema',
    description: 'Ame filmes (rating "Amei")',
    tiers: [
      { tier: 'bronze', requirement: 10, icon: '❤️', xpReward: 30 },
      { tier: 'silver', requirement: 50, icon: '💖', xpReward: 100 },
      { tier: 'gold', requirement: 200, icon: '💗', xpReward: 250 },
      { tier: 'diamond', requirement: 500, icon: '💕', xpReward: 800 },
    ],
  },
  // ── Genres ──
  {
    id: 'genre_explorer', category: 'genres', name: 'Explorador de Gêneros',
    description: 'Avalie filmes de gêneros diferentes',
    tiers: [
      { tier: 'bronze', requirement: 3, icon: '🎯', xpReward: 20 },
      { tier: 'silver', requirement: 5, icon: '🌈', xpReward: 60 },
      { tier: 'gold', requirement: 8, icon: '🌟', xpReward: 150 },
      { tier: 'diamond', requirement: 10, icon: '✨', xpReward: 400 },
    ],
  },
  {
    id: 'genre_specialist', category: 'genres', name: 'Especialista',
    description: 'Avalie N filmes de um único gênero',
    tiers: [
      { tier: 'bronze', requirement: 10, icon: '🎭', xpReward: 25 },
      { tier: 'silver', requirement: 25, icon: '🎪', xpReward: 75 },
      { tier: 'gold', requirement: 50, icon: '🎖️', xpReward: 200 },
      { tier: 'diamond', requirement: 100, icon: '👑', xpReward: 500 },
    ],
  },
  // ── Streaks ──
  {
    id: 'streak_master', category: 'streaks', name: 'Sequência Impecável',
    description: 'Mantenha uma sequência de dias consecutivos',
    tiers: [
      { tier: 'bronze', requirement: 7, icon: '🔥', xpReward: 15 },
      { tier: 'silver', requirement: 30, icon: '⚡', xpReward: 50 },
      { tier: 'gold', requirement: 100, icon: '💫', xpReward: 150 },
      { tier: 'diamond', requirement: 365, icon: '🌟', xpReward: 500 },
    ],
  },
  // ── Social ──
  {
    id: 'social_butterfly', category: 'social', name: 'Borboleta Social',
    description: 'Faça amigos no MrCine',
    tiers: [
      { tier: 'bronze', requirement: 3, icon: '🤝', xpReward: 20 },
      { tier: 'silver', requirement: 10, icon: '👥', xpReward: 60 },
      { tier: 'gold', requirement: 25, icon: '🎉', xpReward: 150 },
      { tier: 'diamond', requirement: 50, icon: '🏆', xpReward: 400 },
    ],
  },
  {
    id: 'influencer', category: 'social', name: 'Influencer',
    description: 'Seu perfil público recebeu visitas',
    tiers: [
      { tier: 'bronze', requirement: 50, icon: '📱', xpReward: 30 },
      { tier: 'silver', requirement: 200, icon: '📸', xpReward: 80 },
      { tier: 'gold', requirement: 1000, icon: '🎬', xpReward: 200 },
      { tier: 'diamond', requirement: 5000, icon: '⭐', xpReward: 500 },
    ],
  },
  // ── Collection ──
  {
    id: 'watchlist_collector', category: 'collection', name: 'Colecionador',
    description: 'Salve filmes na lista "Ver Depois"',
    tiers: [
      { tier: 'bronze', requirement: 10, icon: '📋', xpReward: 20 },
      { tier: 'silver', requirement: 50, icon: '📚', xpReward: 60 },
      { tier: 'gold', requirement: 100, icon: '🗂️', xpReward: 150 },
      { tier: 'diamond', requirement: 250, icon: '💎', xpReward: 400 },
    ],
  },
  // ── Leagues ──
  {
    id: 'league_progress', category: 'leagues', name: 'Ascensão',
    description: 'Alcance novas ligas',
    tiers: [
      { tier: 'bronze', requirement: 7, icon: '🎬', xpReward: 50 },
      { tier: 'silver', requirement: 13, icon: '⭐', xpReward: 100 },
      { tier: 'gold', requirement: 19, icon: '🏛️', xpReward: 200 },
      { tier: 'diamond', requirement: 25, icon: '🌌', xpReward: 500 },
    ],
  },
  // ── Codes ──
  {
    id: 'code_hunter', category: 'codes', name: 'Caçador de Códigos',
    description: 'Resgate códigos secretos',
    tiers: [
      { tier: 'bronze', requirement: 1, icon: '🔑', xpReward: 30 },
      { tier: 'silver', requirement: 5, icon: '🔐', xpReward: 80 },
      { tier: 'gold', requirement: 10, icon: '🗝️', xpReward: 200 },
      { tier: 'diamond', requirement: 25, icon: '💎', xpReward: 500 },
    ],
  },
];

// ─── Challenge Config (v3) ──────────────────────────────────
export type ChallengeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ChallengeType = 'daily' | 'weekly' | 'monthly';

export const CHALLENGE_RARITY_WEIGHTS: Record<ChallengeRarity, number> = {
  common: 70,
  rare: 20,
  epic: 8,
  legendary: 2,
};

export const CHALLENGE_RARITY_XP: Record<ChallengeRarity, number> = {
  common: 1.0,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
};

export const CHALLENGE_RARITY_ICONS: Record<ChallengeRarity, string> = {
  common: '⚪',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

export const CHALLENGE_RARITY_COLORS: Record<ChallengeRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

export interface ChallengeTemplate {
  key: string;
  description: string;
  targets: number[];
  baseXP: number;
  type: ChallengeType;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Daily
  { key: 'daily_rate_3', description: 'Avalie 3 filmes hoje', targets: [3], baseXP: 15, type: 'daily' },
  { key: 'daily_rate_5', description: 'Avalie 5 filmes hoje', targets: [5], baseXP: 25, type: 'daily' },
  { key: 'daily_love_2', description: 'Ame 2 filmes hoje', targets: [2], baseXP: 20, type: 'daily' },
  { key: 'daily_genre_2', description: 'Avalie 2 filmes de um mesmo gênero', targets: [2], baseXP: 20, type: 'daily' },
  { key: 'daily_rate_8', description: 'Avalie 8 filmes hoje (maratona!)', targets: [8], baseXP: 40, type: 'daily' },
  // Weekly
  { key: 'weekly_rate_15', description: 'Avalie 15 filmes esta semana', targets: [15], baseXP: 50, type: 'weekly' },
  { key: 'weekly_rate_25', description: 'Avalie 25 filmes esta semana', targets: [25], baseXP: 80, type: 'weekly' },
  { key: 'weekly_genre_5', description: 'Explore 5 gêneros diferentes esta semana', targets: [5], baseXP: 40, type: 'weekly' },
  { key: 'weekly_streak_5', description: 'Mantenha sequência por 5 dias', targets: [5], baseXP: 60, type: 'weekly' },
  // Monthly
  { key: 'monthly_rate_50', description: 'Avalie 50 filmes este mês', targets: [50], baseXP: 150, type: 'monthly' },
  { key: 'monthly_rate_100', description: 'Avalie 100 filmes este mês (insano!)', targets: [100], baseXP: 300, type: 'monthly' },
  { key: 'monthly_all_genres', description: 'Avalie filmes de todos os gêneros disponíveis', targets: [10], baseXP: 200, type: 'monthly' },
];

// ─── Tier Colors & Labels ───────────────────────────────────
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: 'from-amber-700 to-amber-500',
  silver: 'from-gray-400 to-gray-300',
  gold: 'from-yellow-500 to-amber-400',
  diamond: 'from-cyan-400 to-blue-400',
};

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
};

export const TIER_BORDER: Record<AchievementTier, string> = {
  bronze: 'border-amber-600/50',
  silver: 'border-gray-400/50',
  gold: 'border-yellow-500/50',
  diamond: 'border-cyan-400/50',
};

// ─── Utility: Soft Cap Multiplier ───────────────────────────
export function getDailyRatingXPMultiplier(ratingsToday: number, isPRO: boolean): number {
  const cap = DAILY_XP_SOFT_CAP;
  if (isPRO) {
    if (ratingsToday <= cap.PRO_FULL_XP_RATINGS) return 1.0;
    if (ratingsToday <= cap.PRO_REDUCED_UNTIL) return cap.PRO_REDUCED_MULTIPLIER;
    return 0;
  }
  if (ratingsToday <= cap.FREE_FULL_XP_RATINGS) return 1.0;
  if (ratingsToday <= cap.FREE_REDUCED_UNTIL) return cap.FREE_REDUCED_MULTIPLIER;
  return 0;
}

// ─── Utility: Genre Specialist Threshold ────────────────────
export function getGenreSpecialistThreshold(totalGenresAvailable: number): number {
  // Adaptive: if few genres, lower threshold
  return Math.max(5, Math.floor(totalGenresAvailable * 3));
}

// ─── Utility: Pick random challenge rarity ──────────────────
export function pickChallengeRarity(): ChallengeRarity {
  const roll = Math.random() * 100;
  if (roll < CHALLENGE_RARITY_WEIGHTS.legendary) return 'legendary';
  if (roll < CHALLENGE_RARITY_WEIGHTS.legendary + CHALLENGE_RARITY_WEIGHTS.epic) return 'epic';
  if (roll < CHALLENGE_RARITY_WEIGHTS.legendary + CHALLENGE_RARITY_WEIGHTS.epic + CHALLENGE_RARITY_WEIGHTS.rare) return 'rare';
  return 'common';
}
