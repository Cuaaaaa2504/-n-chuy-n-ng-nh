import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import MovieCard from './MovieCard';

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  /** Giữ lại để không phải sửa call-site. */
  darkMode?: boolean;
}

export default function MovieSection({ title, movies }: MovieSectionProps) {
  return (
    <section className="mb-14">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-2 h-8 rounded-full bg-primary-container shadow-[0_0_12px_rgba(221,183,255,0.6)]" />
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            {title}
          </h2>
        </div>

        <Link
          to="/movies"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/40 font-label-sm text-label-sm uppercase tracking-wider text-secondary hover:bg-secondary/10 hover:shadow-[0_0_16px_rgba(76,215,246,0.4)] transition-all duration-300"
        >
          <span>Xem tất cả</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter-mobile md:gap-gutter-desktop">
          {movies.map((movie) => (
            <MovieCard key={movie.movie_id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-xl py-12 text-center">
          <span className="material-symbols-outlined text-[36px] text-outline">movie_off</span>
          <p className="font-body-md text-on-surface-variant mt-2">Không có phim nào.</p>
        </div>
      )}
    </section>
  );
}
