import { Link } from 'react-router-dom';
import type { Movie } from '../types/movie';
import MovieCard from './MovieCard';

interface MovieSectionProps { title: string; movies: Movie[]; darkMode?: boolean; }

export default function MovieSection({ title, movies }: MovieSectionProps) {
  return (
    <section className="mb-20">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="stitch-kicker mb-2">Now at CMC Cinema</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-.035em]">{title}</h2>
        </div>
        <Link to="/movies" className="stitch-btn stitch-btn-outline">
          Xem tất cả <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
      {movies.length ? (
        <div className="stitch-movie-grid">
          {movies.slice(0, 8).map((movie) => <MovieCard key={movie.movie_id} movie={movie} />)}
        </div>
      ) : (
        <div className="stitch-card p-12 text-center stitch-muted">Không có phim phù hợp.</div>
      )}
    </section>
  );
}
