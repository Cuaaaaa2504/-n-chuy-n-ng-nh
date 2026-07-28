import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';

interface HeroBannerProps {
  movies: Movie[];
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (movies.length === 0) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % movies.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [movies.length]);

  const prev = () => setCurrent((c) => (c - 1 + movies.length) % movies.length);
  const next = () => setCurrent((c) => (c + 1) % movies.length);

  if (movies.length === 0) return null;

  const movie = movies[current];

  return (
    <div className="relative w-full overflow-hidden select-none">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-center transition-all duration-700 scale-105"
        style={{ backgroundImage: `url(${movie.backdrop_url || movie.poster_url})` }}
      />
      {/* Phủ tối + hắt neon */}
      <div className="absolute inset-0 bg-gradient-to-r from-ultra-dark-navy via-ultra-dark-navy/85 to-ultra-dark-navy/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ultra-dark-navy via-transparent to-transparent" />

      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 md:py-28 min-h-[520px] flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <span className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full font-label-sm text-label-sm uppercase tracking-wider bg-primary-container/15 border border-primary-container/30 text-primary-container shadow-[0_0_14px_rgba(221,183,255,0.3)]">
            <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
            Phim nổi bật
          </span>

          <h1 className="font-display-lg text-headline-lg md:text-display-lg text-primary-container text-glow mb-4">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body-md text-on-surface-variant mb-6">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
              {movie.duration_minutes} phút
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">theaters</span>
              {movie.genres.join(', ')}
            </span>
            <span className="px-2 py-0.5 rounded border border-white/20 bg-surface-variant/50 font-label-sm text-label-sm">
              {movie.age_rating}
            </span>
          </div>

          <div className="flex gap-4 flex-wrap">
            <Link
              to={`/movies/${movie.movie_id}`}
              className="btn-primary px-7 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              Mua vé ngay
            </Link>

            {movie.trailer_url && (
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-7 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                Xem trailer
              </a>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 max-w-xs w-full glass-panel rounded-xl p-6">
          <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary mb-3">
            Nội dung phim
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {movie.description || 'Đang cập nhật nội dung phim...'}
          </p>
        </div>
      </div>

      <button
        onClick={prev}
        aria-label="Phim trước"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full glass-panel text-on-surface-variant hover:text-secondary hover:shadow-[0_0_18px_rgba(76,215,246,0.45)] flex items-center justify-center transition-all"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>

      <button
        onClick={next}
        aria-label="Phim tiếp theo"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full glass-panel text-on-surface-variant hover:text-secondary hover:shadow-[0_0_18px_rgba(76,215,246,0.45)] flex items-center justify-center transition-all"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Chuyển tới phim ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-7 h-2 bg-primary-container shadow-[0_0_12px_rgba(221,183,255,0.8)]'
                : 'w-2 h-2 bg-on-surface-variant/40 hover:bg-secondary'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
