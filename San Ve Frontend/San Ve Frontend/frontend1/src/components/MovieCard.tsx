import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';

interface Props {
  movie: Movie;
  /** Giữ lại để không phải sửa call-site; theme Cyber Neon chỉ có bảng màu tối. */
  darkMode?: boolean;
}

const FALLBACK_POSTER = 'https://picsum.photos/seed/fallbackposter/500/750';

export default function MovieCard({ movie }: Props) {
  return (
    <Link
      to={`/movies/${movie.movie_id}`}
      className="movie-card glass-panel group relative block w-full aspect-[2/3] overflow-hidden rounded-lg cursor-pointer"
    >
      <img
        src={movie.poster_url}
        alt={movie.title}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_POSTER;
        }}
        className="w-full h-full object-cover"
      />

      {/* Lớp phủ gradient */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-ultra-dark-navy via-ultra-dark-navy/60 to-transparent backdrop-blur-[2px]">
        <span className="w-max mb-2 px-2 py-1 rounded font-label-sm text-[10px] bg-primary-container/20 border border-primary-container/30 text-primary-container shadow-[0_0_10px_rgba(221,183,255,0.3)]">
          {movie.age_rating}
        </span>

        <h3 className="font-title-md text-title-md text-on-surface mb-1 truncate group-hover:text-glow transition-all">
          {movie.title}
        </h3>

        <p className="font-label-sm text-label-sm text-secondary truncate">
          {movie.genres.length > 0 ? movie.genres.join(' / ') : 'Đang cập nhật'}
        </p>

        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {movie.duration_minutes} phút
        </p>

        <span className="btn-primary w-full py-2 rounded-lg mt-4 text-center font-title-md text-[14px] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Đặt vé
        </span>
      </div>
    </Link>
  );
}
