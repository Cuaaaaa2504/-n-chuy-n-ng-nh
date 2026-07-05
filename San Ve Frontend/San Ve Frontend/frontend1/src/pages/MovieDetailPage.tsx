import { Link, useNavigate, useParams } from 'react-router-dom';
import { mockMovies } from '../data/mockMovies';
import { useTheme } from '../context/ThemeContext';

const FALLBACK_POSTER = 'https://picsum.photos/seed/fallbackposter/500/750';
const FALLBACK_BACKDROP = 'https://picsum.photos/seed/fallbackbackdrop/1600/900';

function getYoutubeEmbedUrl(url?: string) {
  if (!url) return null;
  if (url.includes('watch?v=')) {
    const id = url.split('watch?v=')[1]?.split('&')[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  return null;
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const movie = mockMovies.find((m) => String(m.movie_id) === id);

  if (!movie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Không tìm thấy phim</h1>
          <Link to="/" className="inline-block bg-red-500 text-white px-5 py-2 rounded-lg">
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const trailerEmbedUrl = getYoutubeEmbedUrl(movie.trailer_url);

  return (
    <div>
      {/* Hero backdrop */}
      <div className="relative h-[420px] md:h-[560px] overflow-hidden">
        <img
          src={movie.backdrop_url || FALLBACK_BACKDROP}
          alt={movie.title}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_BACKDROP; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute top-5 left-5 z-20 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
          >
            ← Quay lại
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
          >
            Trang chủ
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-10 pb-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-end gap-8">
            <img
              src={movie.poster_url}
              alt={movie.title}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_POSTER; }}
              className="w-48 md:w-64 aspect-[2/3] object-cover rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] border border-white/10"
            />
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full font-semibold">{movie.age_rating}</span>
                <span className="bg-white/10 text-white text-sm px-3 py-1 rounded-full border border-white/10">{movie.duration_minutes} phút</span>
                <span className="bg-white/10 text-white text-sm px-3 py-1 rounded-full border border-white/10">
                  {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">{movie.title}</h1>
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres.map((genre) => (
                  <span key={genre} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full border border-white/10">
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-white/90 text-base md:text-lg leading-8 max-w-3xl whitespace-pre-line mb-8">
                {movie.description || 'Đang cập nhật nội dung phim...'}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate(`/showtimes/${movie.movie_id}`)}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition"
                >
                  🎟 Mua vé
                </button>
                {movie.trailer_url ? (
                  <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl border border-white/15 backdrop-blur-sm transition">
                    ▶ Xem trailer
                  </a>
                ) : (
                  <button disabled className="bg-white/10 text-white/50 font-semibold px-6 py-3 rounded-xl border border-white/10 cursor-not-allowed">
                    ▶ Chưa có trailer
                  </button>
                )}
                <button className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl border border-white/15 backdrop-blur-sm transition">
                  ❤ Yêu thích
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info + Trailer */}
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow'}`}>
            <h3 className="text-lg font-bold mb-3">Thông tin phim</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Tên phim:</span> {movie.title}</p>
              <p><span className="font-semibold">Thời lượng:</span> {movie.duration_minutes} phút</p>
              <p><span className="font-semibold">Phân loại:</span> {movie.age_rating}</p>
              <p><span className="font-semibold">Trạng thái:</span> {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</p>
              <p><span className="font-semibold">Thể loại:</span> {movie.genres.join(', ')}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow'}`}>
            <h3 className="text-lg font-bold mb-3">Hành động nhanh</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(`/showtimes/${movie.movie_id}`)}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 rounded-xl transition"
              >
                Mua vé
              </button>
              <button className={`font-semibold px-5 py-3 rounded-xl border transition ${
                darkMode ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200'
              }`}>
                Xem suất chiếu gần nhất
              </button>
            </div>
          </div>
        </div>

        {trailerEmbedUrl ? (
          <div className={`rounded-2xl p-6 shadow-md ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-extrabold">Trailer</h2>
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="text-sm text-red-400 hover:text-red-300">
                Mở trên YouTube
              </a>
            </div>
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe src={trailerEmbedUrl} title={`${movie.title} trailer`} className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl p-6 shadow-md ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-extrabold mb-3">Trailer</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Hiện chưa có trailer phù hợp cho phim này.</p>
          </div>
        )}
      </div>
    </div>
  );
}