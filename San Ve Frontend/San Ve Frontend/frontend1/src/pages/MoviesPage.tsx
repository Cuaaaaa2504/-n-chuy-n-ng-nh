// src/pages/MoviesPage.tsx
//
// FIX Lỗi 1: trang này tự gọi `axiosClient.get('/movies')` rồi kiểm tra
// `Array.isArray(data)`. Backend trả về `{ items, total, page, limit, totalPages }`
// nên `Array.isArray({...})` luôn false -> `movies` luôn là [] -> trang vĩnh viễn
// hiển thị "Chưa có phim nào".
//
// Nay dùng lại `useMovies()` / `getMovies()` — helper đã có sẵn trong dự án và
// đã xử lý đúng cả việc unwrap `items` lẫn normalize camelCase -> snake_case.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../context/useTheme';
import type { Movie } from '../types/movie';

const FALLBACK_POSTER = 'https://picsum.photos/seed/fallbackposter/300/450';

const STATUS_TABS: { key: Movie['status'] | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NOW_SHOWING', label: 'Đang chiếu' },
  { key: 'COMING_SOON', label: 'Sắp chiếu' },
];

export default function MoviesPage() {
  const { darkMode } = useTheme();
  const { movies, loading, error, fetchMovies } = useMovies();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Movie['status'] | 'ALL'>('ALL');

  const filtered = useMemo(
    () =>
      movies.filter((m) => {
        const matchStatus = status === 'ALL' ? m.status !== 'HIDDEN' : m.status === status;
        const matchSearch = m.title.toLowerCase().includes(search.trim().toLowerCase());
        return matchStatus && matchSearch;
      }),
    [movies, search, status],
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-6">🎬 Danh sách phim</h1>

        {/* Bộ lọc */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên phim..."
            className={`px-4 py-2 rounded-xl border outline-none w-64 text-sm transition focus:border-blue-500 ${
              darkMode
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <div className="flex gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  status === t.key
                    ? 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-gray-500'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filtered.length} phim
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="max-w-md mx-auto text-center py-16">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-red-500 mb-5">{error}</p>
            <button
              onClick={() => void fetchMovies()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className={`text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {search || status !== 'ALL' ? 'Không tìm thấy phim phù hợp.' : 'Chưa có phim nào.'}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filtered.map((movie) => (
            <Link
              key={movie.movie_id}
              to={`/movies/${movie.movie_id}`}
              className={`group rounded-xl overflow-hidden shadow transition hover:-translate-y-1 hover:shadow-xl ${
                darkMode ? 'bg-gray-900' : 'bg-white'
              }`}
            >
              <div className="aspect-[2/3] overflow-hidden">
                <img
                  src={movie.poster_url || FALLBACK_POSTER}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_POSTER;
                  }}
                />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{movie.title}</p>
                {movie.genres.length > 0 && (
                  <p
                    className={`text-xs mt-1 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {movie.genres.join(', ')}
                  </p>
                )}
                {movie.duration_minutes > 0 && (
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {movie.duration_minutes} phút
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
