import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useTheme } from '../context/ThemeContext';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  poster_url?: string;
  genres?: string[];
  duration_minutes?: number;
  status?: string;
}

export default function MoviesPage() {
  const { darkMode } = useTheme();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const fetchMovies = async () => {
      try {
        const data = await axiosClient.get('/movies') as unknown as Movie[];
        if (!ignore) setMovies(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        if (!ignore)
          setError((err as { message?: string }).message || 'Không tải được danh sách phim');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchMovies();
    return () => { ignore = true; };
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-8">🎬 Danh sách phim</h1>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-red-500 text-center py-10">{error}</p>}

        {!loading && !error && movies.length === 0 && (
          <p className={`text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Chưa có phim nào.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {movies.map((movie) => (
            <Link
              key={movie.id}
              to={`/movies/${movie.id}`}
              className={`group rounded-xl overflow-hidden shadow transition hover:-translate-y-1 hover:shadow-xl ${
                darkMode ? 'bg-gray-900' : 'bg-white'
              }`}
            >
              <div className="aspect-[2/3] overflow-hidden">
                <img
                  src={movie.poster_url || `https://picsum.photos/seed/${movie.id}/300/450`}
                  alt={movie.title || movie.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.currentTarget.src = `https://picsum.photos/seed/${movie.id}/300/450`;
                  }}
                />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{movie.title || movie.name}</p>
                {movie.genres && (
                  <p className={`text-xs mt-1 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {movie.genres.join(', ')}
                  </p>
                )}
                {movie.duration_minutes && (
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
