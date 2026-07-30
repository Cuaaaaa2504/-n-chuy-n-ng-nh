import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { resolveAssetUrl } from '../utils/assetUrl';

interface Props { movie: Movie; darkMode?: boolean; }
const FALLBACK_POSTER = 'https://picsum.photos/seed/cmc-card/600/900';

export default function MovieCard({ movie }: Props) {
  return (
    <Link to={`/movies/${movie.movie_id}`} className="stitch-movie-card stitch-card-hover group block">
      <img
        src={resolveAssetUrl(movie.poster_url) || FALLBACK_POSTER}
        alt={movie.title}
        onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }}
      />
      <div className="stitch-movie-card-overlay">
        <div className="flex gap-2 mb-3">
          {movie.age_rating && <span className="stitch-badge stitch-badge-purple">{movie.age_rating}</span>}
          <span className="stitch-badge stitch-badge-cyan">{movie.status === 'COMING_SOON' ? 'Sắp chiếu' : '2D'}</span>
        </div>
        <h3 className="stitch-movie-title line-clamp-2">{movie.title}</h3>
        <p className="mt-2 text-[11px] uppercase tracking-[.12em] text-white/65 line-clamp-1">
          {movie.genres?.join(', ') || 'Đang cập nhật'}
        </p>
        <p className="mt-1 text-xs text-white/50">{movie.duration_minutes || 0} phút</p>
      </div>
    </Link>
  );
}
