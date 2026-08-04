export interface Movie {
  movie_id: number;
  title: string;
  duration_minutes: number;
  age_rating: string;
  poster_url: string;
  backdrop_url?: string;
  description?: string;
  trailer_url?: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'ENDED' | 'HIDDEN';

  genres: string[];

  genre_ids?: number[];

  release_date?: string | null;

  release_year?: number | null;
  imdb_rating?: number | string | null;
  average_rating?: number | string | null;
}

export const AGE_RATINGS = ['P', 'K', 'T13', 'T16', 'T18', 'C'] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

export const AGE_RATING_LABEL: Record<string, string> = {
  P: 'P — Mọi lứa tuổi',
  K: 'K — Dưới 13 tuổi (có người lớn đi kèm)',
  T13: 'T13 — Từ 13 tuổi',
  T16: 'T16 — Từ 16 tuổi',
  T18: 'T18 — Từ 18 tuổi',
  C: 'C — Không được phổ biến',
};

export interface Genre {
  id: number;
  name: string;
}
