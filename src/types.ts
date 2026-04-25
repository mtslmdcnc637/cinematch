export type Movie = {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  genre_ids: number[];
  overview: string;
  vote_average: number;
};

export type Rating = 'loved' | 'liked' | 'disliked' | 'not_seen';

export type UserRating = {
  movieId: number;
  rating: Rating;
  timestamp: number;
  movie?: Movie;
};

export type WatchlistItem = {
  movieId: number;
  timestamp: number;
  movie?: Movie;
};

export type UserProfile = {
  id?: string;
  email?: string;
  username?: string;
  xp: number;
  level: number;
  genres?: number[];
  ratings?: UserRating[];
  // Gamification v2 fields
  activeTitle?: string;
  totalRatings?: number;
};

// ── Oracle structured result types ──
export interface OracleMovieRec {
  title: string;
  year: number;
  tmdb_id: number;
  reason: string;
}

export interface OracleResult {
  summary: string;
  movies: OracleMovieRec[];
  fallback_text?: string;
}

// ── Gamification v3 Types ──

export type StreakStatus = 'active' | 'frozen' | 'broken';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type AchievementCategory = 'ratings' | 'genres' | 'streaks' | 'social' | 'collection' | 'leagues' | 'codes';
export type ChallengeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ChallengeType = 'daily' | 'weekly' | 'monthly';

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_status: StreakStatus;
  streak_freeze_count: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  tier: AchievementTier;
  unlocked_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_type: ChallengeType;
  challenge_key: string;
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  rarity: ChallengeRarity;
  is_completed: boolean;
  assigned_date: string;
  completed_at: string | null;
}

export interface DailyXPTracking {
  user_id: string;
  date: string;
  rating_count: number;
  xp_from_ratings: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  subscription_plan: string;
  current_streak: number;
  achievement_count: number;
}
