import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Movie } from "../types/movie";

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
    <div className="relative w-full overflow-hidden mb-0 select-none">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-center transition-all duration-700"
        style={{
          backgroundImage: `url(${movie.backdrop_url || movie.poster_url})`,
        }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 px-10 md:px-24 py-20 md:py-32 min-h-[550px]">
        <div className="flex-1">
          <span className="inline-block bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full mb-4 tracking-widest uppercase backdrop-blur-sm">
            🔥 Phim nổi bật
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-3 drop-shadow-lg">
            {movie.title}
          </h1>

          <div className="flex flex-wrap gap-3 text-white/80 text-base mb-4">
            <span>⏱ {movie.duration_minutes} phút</span>
            <span>•</span>
            <span>🎭 {movie.genres.join(", ")}</span>
            <span>•</span>
            <span>🔞 {movie.age_rating}</span>
          </div>

          <div className="flex gap-3 mt-6 flex-wrap">
            <Link
              to={`/movies/${movie.movie_id}`}
              className="px-7 py-3 bg-transparent border-2 border-white text-white text-base font-bold rounded-xl hover:bg-white/20 transition"
            >
              🎟 Mua vé ngay
            </Link>

            {movie.trailer_url && (
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 bg-transparent border-2 border-white text-white text-base font-bold rounded-xl hover:bg-white/20 transition"
              >
                ▶ Xem trailer
              </a>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 max-w-xs w-full">
          <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-3">
            📖 Nội dung phim
          </p>
          <p className="text-white/90 text-base leading-relaxed">
            {movie.description || "Đang cập nhật nội dung phim..."}
          </p>
        </div>
      </div>

      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center text-xl transition backdrop-blur-sm"
      >
        ‹
      </button>

      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center text-xl transition backdrop-blur-sm"
      >
        ›
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
