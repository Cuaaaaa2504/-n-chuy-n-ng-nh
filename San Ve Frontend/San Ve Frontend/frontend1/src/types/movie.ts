// FIX TS2353: thêm release_date vào Movie interface vì ShowtimeSelectPage
// build object MockMovie (extends Movie) có field release_date từ server API
export interface Movie {
  movie_id: number;
  title: string;
  duration_minutes: number;
  age_rating: string;
  poster_url: string;
  backdrop_url?: string;
  description?: string;
  trailer_url?: string;
  status: "NOW_SHOWING" | "COMING_SOON" | "ENDED";
  genres: string[];
  featured?: boolean;
  // FIX TS2353: server có thể trả về release_date
  release_date?: string;
}
