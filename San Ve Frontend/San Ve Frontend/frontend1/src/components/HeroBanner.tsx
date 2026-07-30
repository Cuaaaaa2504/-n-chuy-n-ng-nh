import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';

interface HeroBannerProps {
  movies: Movie[];
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const featuredMovies = movies.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const transitioningRef = useRef(false);

  useEffect(() => {
    if (current < featuredMovies.length) return;

    const timer = window.setTimeout(() => {
      setCurrent(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [current, featuredMovies.length]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const changeSlide = useCallback(
    (nextIndex: number) => {
      if (featuredMovies.length < 2 || transitioningRef.current) return;

      const normalizedIndex =
        (nextIndex + featuredMovies.length) % featuredMovies.length;
      if (normalizedIndex === current) return;

      transitioningRef.current = true;
      setTransitioning(true);

      transitionTimerRef.current = window.setTimeout(() => {
        setCurrent(normalizedIndex);
        setTransitioning(false);
        transitioningRef.current = false;
        transitionTimerRef.current = null;
      }, 300);
    },
    [current, featuredMovies.length],
  );

  useEffect(() => {
    if (featuredMovies.length < 2) return;

    const timer = window.setInterval(() => {
      changeSlide(current + 1);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [changeSlide, current, featuredMovies.length]);

  if (featuredMovies.length === 0) return null;

  const movie = featuredMovies[current];
  const releaseYearFromDate = movie.release_date
    ? Number.parseInt(movie.release_date.slice(0, 4), 10)
    : undefined;
  const releaseYear =
    movie.release_year ??
    (releaseYearFromDate && Number.isFinite(releaseYearFromDate)
      ? releaseYearFromDate
      : undefined);
  const rawRating = movie.imdb_rating ?? movie.average_rating;
  const numericRating = rawRating == null ? undefined : Number(rawRating);
  const rating =
    numericRating !== undefined && Number.isFinite(numericRating)
      ? numericRating.toFixed(1)
      : undefined;

  const prev = () => changeSlide(current - 1);
  const next = () => changeSlide(current + 1);

  return (
    <section className="relative w-full overflow-hidden select-none">
      <div
        key={movie.movie_id}
        className="absolute inset-0 bg-cover bg-no-repeat bg-center transition-all duration-700 scale-105"
        style={{ backgroundImage: `url(${movie.backdrop_url || movie.poster_url})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ultra-dark-navy via-ultra-dark-navy/85 to-ultra-dark-navy/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ultra-dark-navy via-transparent to-transparent" />

      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop min-h-[716px] md:min-h-[870px] pb-[100px] md:pb-[80px] pt-[80px] flex flex-col md:flex-row items-center gap-12">
        <div
          className={`flex-1 transition-all duration-300 ${
            transitioning
              ? 'opacity-0 translate-y-5'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <span className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full font-label-sm text-label-sm uppercase tracking-wider bg-primary-container/15 border border-primary-container/30 text-primary-container shadow-[0_0_14px_rgba(221,183,255,0.3)]">
            <span className="material-symbols-outlined text-[16px]">
              local_fire_department
            </span>
            Phim nổi bật
          </span>

          <h1 className="font-display-lg text-headline-lg md:text-display-lg text-primary-container text-glow mb-4">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-body-md text-on-surface-variant mb-3">
            {releaseYear && (
              <span className="flex items-center gap-1.5 text-secondary drop-shadow-[0_0_5px_rgba(76,215,246,0.5)]">
                <span className="material-symbols-outlined text-[18px]">
                  calendar_month
                </span>
                {releaseYear}
              </span>
            )}
            {releaseYear && <span aria-hidden="true">•</span>}
            <span className="flex items-center gap-1.5 text-secondary drop-shadow-[0_0_5px_rgba(76,215,246,0.5)]">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              {movie.duration_minutes} phút
            </span>
            {rating && <span aria-hidden="true">•</span>}
            {rating && (
              <span className="flex items-center gap-1.5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                <span className="material-symbols-outlined text-[18px]">star</span>
                {rating} IMDb
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 font-body-md text-on-surface-variant mb-6">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                theaters
              </span>
              {movie.genres?.join(', ') || 'Đang cập nhật thể loại'}
            </span>
            {movie.age_rating && (
              <span className="px-2 py-0.5 rounded border border-white/20 bg-surface-variant/50 font-label-sm text-label-sm">
                {movie.age_rating}
              </span>
            )}
          </div>

          <div className="flex gap-4 flex-wrap">
            <Link
              to={`/movies/${movie.movie_id}`}
              className="btn-primary px-7 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                confirmation_number
              </span>
              Mua vé ngay
            </Link>

            {movie.trailer_url && (
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-7 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  play_arrow
                </span>
                Xem trailer
              </a>
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-[0_0_560px] max-w-[48%] flex-col items-end gap-5">
          <div className="flex items-center gap-3 pr-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Phim trước"
              className="w-11 h-11 rounded-full glass-panel text-secondary hover:bg-secondary/10 hover:shadow-[0_0_18px_rgba(76,215,246,0.55)] flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Phim tiếp theo"
              className="w-11 h-11 rounded-full glass-panel text-secondary hover:bg-secondary/10 hover:shadow-[0_0_18px_rgba(76,215,246,0.55)] flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className="carousel-stack flex items-end justify-end gap-4 h-[320px] w-full">
            {featuredMovies.map((item, index) => {
              const active = index === current;

              return (
                <button
                  type="button"
                  key={item.movie_id}
                  onClick={() => changeSlide(index)}
                  aria-label={`Chuyển tới phim ${item.title}`}
                  aria-current={active ? 'true' : undefined}
                  className={`carousel-card ${active ? 'active' : 'inactive'}`}
                >
                  <img
                    src={item.poster_url}
                    alt={`Poster ${item.title}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-12 text-left font-label-sm text-[11px] uppercase tracking-wider text-white">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {featuredMovies.map((item, index) => (
          <button
            type="button"
            key={item.movie_id}
            onClick={() => changeSlide(index)}
            aria-label={`Chuyển tới phim ${index + 1}`}
            aria-current={index === current ? 'true' : undefined}
            className={`rounded-full transition-all duration-300 ${
              index === current
                ? 'w-7 h-2 bg-primary-container shadow-[0_0_12px_rgba(221,183,255,0.8)]'
                : 'w-2 h-2 bg-on-surface-variant/40 hover:bg-secondary'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
