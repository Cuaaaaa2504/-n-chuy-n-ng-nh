import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { resolveAssetUrl } from '../utils/assetUrl';
import FavoriteMovieButton from './FavoriteMovieButton';
import InteractiveMovieRating from './InteractiveMovieRating';

interface Props { movie: Movie; darkMode?: boolean; }
const FALLBACK_POSTER = 'https://picsum.photos/seed/cmc-card/600/900';

export default function MovieCard({ movie }: Props) {
  const score = movie.average_rating ?? movie.imdb_rating;

  return (
    <Link to={`/movies/${movie.movie_id}`} className="stitch-movie-card stitch-card-hover group relative block">
      <img
        src={resolveAssetUrl(movie.poster_url) || FALLBACK_POSTER}
        alt={movie.title}
        onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }}
      />

      <div className="absolute left-3 top-3 z-20">
        <InteractiveMovieRating
          movieId={movie.movie_id}
          score={score}
          fallbackScore={0}
          className="rounded-full bg-black/65 px-1.5 py-0.5 shadow-lg backdrop-blur-md"
        />
      </div>
      <FavoriteMovieButton movieId={movie.movie_id} className="absolute right-3 top-3 z-20" />

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
