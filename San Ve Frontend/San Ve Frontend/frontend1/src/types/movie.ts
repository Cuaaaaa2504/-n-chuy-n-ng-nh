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

  /** Tên thể loại — chỉ dùng để HIỂN THỊ. Backend không nhận field này. */
  genres: string[];

  /*
   * Backend `CreateMovieDto` yêu cầu ID số nguyên của thể loại có sẵn,
   * còn `genres` chỉ phục vụ render giao diện.
   */
  genre_ids?: number[];

  release_date?: string | null;

  /** Dữ liệu trình bày cho Hero; hỗ trợ cả mapper frontend và response backend. */
  release_year?: number | null;
  imdb_rating?: number | string | null;
  average_rating?: number | string | null;
}

/** Giá trị hợp lệ của `age_rating`, khớp CHECK constraint trong SQL. */
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

/** Một thể loại phim lấy từ GET /genres */
export interface Genre {
  id: number;
  name: string;
}
