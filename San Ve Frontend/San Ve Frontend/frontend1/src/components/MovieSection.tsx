import { Link } from "react-router-dom";
import type { Movie } from "../types/movie";
import MovieCard from "./MovieCard";

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  darkMode: boolean;
}

export default function MovieSection({
  title,
  movies,
  darkMode,
}: MovieSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        </div>

        <Link
          to="/movies"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black bg-white border border-gray-300 transition duration-300 hover:bg-gray-100 no-underline"
        >
          <span>Xem tất cả</span>
          <span>→</span>
        </Link>
      </div>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {movies.map((m) => (
            <MovieCard key={m.movie_id} movie={m} darkMode={darkMode} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm py-6 text-center">
          Không có phim nào.
        </p>
      )}
    </section>
  );
}
