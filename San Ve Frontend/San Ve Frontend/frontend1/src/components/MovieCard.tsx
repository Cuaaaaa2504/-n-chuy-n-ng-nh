import { Link } from "react-router-dom";
import type { Movie } from "../types/movie";

interface Props {
  movie: Movie;
  darkMode: boolean;
}

const FALLBACK_POSTER = "https://picsum.photos/seed/fallbackposter/500/750";

export default function MovieCard({ movie, darkMode }: Props) {
  return (
    <div className="w-full">
      <Link
        to={`/movies/${movie.movie_id}`}
        className="group block w-full [perspective:1000px]"
      >
        <div className="relative w-full aspect-[2/3] transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-2xl overflow-hidden shadow-lg ${
              darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
            } [backface-visibility:hidden]`}
          >
            <img
              src={movie.poster_url}
              alt={movie.title}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_POSTER;
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded font-bold shadow-lg z-10">
              {movie.age_rating}
            </span>

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2">
                {movie.title}
              </h3>
              <p className="text-xs text-white/80">⏱ {movie.duration_minutes} phút</p>
            </div>
          </div>

          {/* Back */}
          <div
            className={`absolute inset-0 rounded-2xl shadow-lg p-4 flex flex-col justify-between ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-200"
            } [backface-visibility:hidden] [transform:rotateY(180deg)]`}
          >
            <div>
              <div className="flex items-start gap-3 mb-4">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_POSTER;
                  }}
                  className="w-16 aspect-[2/3] object-cover rounded-lg shadow"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-sm leading-tight mb-2 line-clamp-2">
                    {movie.title}
                  </h3>

                  <div className="flex flex-wrap gap-1">
                    <span className="inline-block bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                      {movie.age_rating}
                    </span>
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium ${
                        darkMode
                          ? "bg-white/10 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {movie.duration_minutes} phút
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className={`text-[10px] px-2 py-1 rounded-full border ${
                      darkMode
                        ? "bg-red-500/10 text-red-300 border-red-500/20"
                        : "bg-red-50 text-red-500 border-red-200"
                    }`}
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p
                className={`text-xs leading-5 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {movie.description}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="w-full rounded-xl bg-red-500 text-white text-sm font-semibold py-2.5 text-center">
                🎟 Mua vé
              </div>

              <div
                className={`w-full rounded-xl text-sm font-semibold py-2.5 text-center border ${
                  darkMode
                    ? "bg-white/5 text-white border-white/10"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                Xem chi tiết
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
