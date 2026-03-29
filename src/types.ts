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
  xp: number;
  level: number;
  genres?: number[];
  ratings?: UserRating[];
};
