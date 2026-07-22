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

  /**
   * FIX Lỗi 2 & 3 (tầng 2): backend `CreateMovieDto` yêu cầu `genreIds: number[]`
   * (ID số nguyên của thể loại có sẵn trong bảng `genres`), không phải mảng tên.
   * Gửi tên -> `resolveGenres()` ném BadRequestException 'Một hoặc nhiều thể
   * loại không tồn tại'. Nay form thao tác trên ID và `genres` chỉ để render.
   */
  genre_ids?: number[];

  release_date?: string;

  // FIX Lỗi 6: đã XOÁ field `featured`.
  // Bảng `movies`, entity `Movie` và `CreateMovieDto` đều không có cột này
  // (`grep -c featured` trên file SQL trả về 0). Giữ nó lại chỉ tạo ra rủi ro:
  // bất kỳ component nào filter/sort theo `featured` cũng luôn nhận undefined
  // với dữ liệu thật từ API. HomePage nay chọn banner theo `status` — tiêu chí
  // có thật trong DB. Muốn có "phim nổi bật" thì phải thêm cột ở DB + DTO trước.
}

/**
 * Giá trị hợp lệ của `age_rating`.
 * FIX: khớp CHECK constraint `CK_movies_age_rating` trong SQL V6.3
 * — ('P','K','T13','T16','T18','C'). Form cũ đưa ra C13/C16/C18, không giá trị
 * nào tồn tại trong constraint -> INSERT bị DB từ chối.
 */
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
