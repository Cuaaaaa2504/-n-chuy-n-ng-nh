import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import { resolveAssetUrl } from '../utils/assetUrl';

interface HeroBannerProps { movies: Movie[]; }

const FALLBACK_POSTER = 'https://picsum.photos/seed/cmc-poster/600/900';
const FALLBACK_BACKDROP = 'https://picsum.photos/seed/cmc-backdrop/1800/1000';

function imageUrl(value?: string, fallback = FALLBACK_POSTER) {
  return resolveAssetUrl(value) || fallback;
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const featured = movies.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const transitionRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (current < featured.length) return;
    const id = window.setTimeout(() => setCurrent(0), 0);
    return () => window.clearTimeout(id);
  }, [current, featured.length]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const changeSlide = useCallback((next: number) => {
    if (featured.length < 2 || transitionRef.current) return;
    const index = (next + featured.length) % featured.length;
    if (index === current) return;
    transitionRef.current = true;
    setTransitioning(true);
    timeoutRef.current = window.setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
      transitionRef.current = false;
      timeoutRef.current = null;
    }, 260);
  }, [current, featured.length]);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = window.setInterval(() => changeSlide(current + 1), 6000);
    return () => window.clearInterval(id);
  }, [changeSlide, current, featured.length]);

  if (!featured.length) return null;
  const movie = featured[current];
  const year = movie.release_year || (movie.release_date ? Number(movie.release_date.slice(0, 4)) : null);
  const rawRating = movie.imdb_rating ?? movie.average_rating;
  const ratingValue = rawRating == null ? null : Number(rawRating);
  const rating = ratingValue !== null && Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : null;

  const positionClass = (index: number) => {
    const distance = (index - current + featured.length) % featured.length;
    if (distance === 0) return 'active';
    if (distance === 1) return 'right-1';
    if (distance === 2) return 'right-2';
    if (distance === featured.length - 1) return 'left-1';
    return 'left-2';
  };

  return (
    <section className="stitch-hero">
      <img
        key={`bg-${movie.movie_id}`}
        className="stitch-hero-bg"
        src={imageUrl(movie.backdrop_url || movie.poster_url, FALLBACK_BACKDROP)}
        alt=""
        onError={(event) => { event.currentTarget.src = FALLBACK_BACKDROP; }}
      />
      <div className="stitch-hero-shade" />

      <div className="stitch-hero-inner">
        <div className={`transition-all duration-300 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <span className="stitch-kicker inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 mb-5">
            <span className="material-symbols-outlined text-[17px]">local_fire_department</span>
            Phim nổi bật
          </span>
          <h1 className="stitch-hero-title mb-6">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm" style={{ color: 'var(--st-cyan)' }}>
            {year && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">calendar_month</span>{year}</span>}
            {year && <span className="stitch-muted">•</span>}
            <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">schedule</span>{movie.duration_minutes || 0} phút</span>
            {rating && <span className="stitch-muted">•</span>}
            {rating && <span className="inline-flex items-center gap-1" style={{ color: 'var(--st-gold)' }}><span className="material-symbols-outlined text-[18px]">star</span>{rating} IMDb</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-6 stitch-muted">
            <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[19px]">theaters</span>{movie.genres?.join(', ') || 'Đang cập nhật thể loại'}</span>
            {movie.age_rating && <span className="stitch-badge stitch-badge-purple">{movie.age_rating}</span>}
          </div>
          <p className="max-w-2xl leading-7 stitch-muted mb-8 line-clamp-3">{movie.description || 'Khám phá câu chuyện điện ảnh đang được yêu thích tại CMC Cinema.'}</p>
          <div className="flex flex-wrap gap-3">
            <Link className="stitch-btn stitch-btn-primary" to={`/movies/${movie.movie_id}`}>
              <span className="material-symbols-outlined">confirmation_number</span>Mua vé ngay
            </Link>
            {movie.trailer_url && (
              <a className="stitch-btn stitch-btn-outline" href={movie.trailer_url} target="_blank" rel="noreferrer">
                <span className="material-symbols-outlined">play_circle</span>Xem trailer
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="stitch-hero-controls">
            <button className="stitch-icon-btn border border-white/10" onClick={() => changeSlide(current - 1)} aria-label="Phim trước"><span className="material-symbols-outlined">chevron_left</span></button>
            <button className="stitch-icon-btn border border-white/10" onClick={() => changeSlide(current + 1)} aria-label="Phim tiếp theo"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div className="stitch-poster-stack">
            {featured.map((item, index) => (
              <button
                key={item.movie_id}
                type="button"
                onClick={() => changeSlide(index)}
                className={`stitch-poster-card ${positionClass(index)}`}
                aria-label={`Chuyển đến phim ${item.title}`}
              >
                <img
                  src={imageUrl(item.poster_url)}
                  alt={`Poster ${item.title}`}
                  onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }}
                />
                <span className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-16 text-left text-xs uppercase tracking-wider text-white bg-gradient-to-t from-black/95 to-transparent">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
