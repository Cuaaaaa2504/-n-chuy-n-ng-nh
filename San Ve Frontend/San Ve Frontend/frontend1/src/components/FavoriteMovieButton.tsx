import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMovieEngagement } from '../hooks/useMovieEngagement';

interface FavoriteMovieButtonProps {
  movieId: number;
  showLabel?: boolean;
  className?: string;
}

export default function FavoriteMovieButton({
  movieId,
  showLabel = false,
  className = '',
}: FavoriteMovieButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isFavorite, toggleFavorite } = useMovieEngagement();
  const active = isFavorite(movieId);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isLoggedIn) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}${location.hash}` },
      });
      return;
    }

    toggleFavorite(movieId);
  };

  const baseClass = showLabel
    ? 'stitch-btn stitch-btn-outline'
    : 'grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-primary/60';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClass} ${className}`}
      aria-pressed={active}
      aria-label={active ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      title={active ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      style={active ? { color: 'var(--st-purple)' } : undefined}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontVariationSettings: active
            ? '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24'
            : '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
        }}
      >
        favorite
      </span>
      {showLabel && <span>{active ? 'Đã yêu thích' : 'Yêu thích'}</span>}
    </button>
  );
}
