import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMovies } from '../hooks/useMovies';
import type { Movie } from '../types/movie';
import MovieCard from '../components/MovieCard';
import { resolveAssetUrl } from '../utils/assetUrl';

const STATUS_TABS: { key: Movie['status'] | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NOW_SHOWING', label: 'Đang chiếu' },
  { key: 'COMING_SOON', label: 'Sắp chiếu' },
];
const FALLBACK_POSTER = 'https://picsum.photos/seed/hot-cmc/240/360';

export default function MoviesPage() {
  const { movies, loading, error, fetchMovies } = useMovies();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Movie['status'] | 'ALL'>('ALL');

  const filtered = useMemo(() => movies.filter((movie) => {
    const matchStatus = status === 'ALL' ? movie.status !== 'HIDDEN' : movie.status === status;
    const matchSearch = movie.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
    return matchStatus && matchSearch;
  }), [movies, search, status]);

  const hotMovies = useMemo(() => movies.filter((movie) => movie.status === 'NOW_SHOWING').slice(0, 3), [movies]);

  return (
    <section className="stitch-page">
      <div className="stitch-container">
        <p className="stitch-kicker mb-3">Cinema catalogue</p>
        <h1 className="stitch-page-title">Khám phá phim</h1>
        <p className="stitch-muted mt-4 max-w-2xl">Danh sách phim đang chiếu và sắp ra mắt tại hệ thống CMC Cinema.</p>

        <div className="stitch-filter-bar stitch-glass">
          <div className="stitch-segment">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} type="button" className={status === tab.key ? 'active' : ''} onClick={() => setStatus(tab.key)}>{tab.label}</button>
            ))}
          </div>
          <div className="stitch-filter-actions flex flex-wrap items-center gap-3">
            <label className="relative min-w-[250px] flex-1">
              <span className="material-symbols-outlined stitch-input-icon" aria-hidden="true">search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="stitch-input stitch-input-with-icon" placeholder="Tìm theo tên phim..." />
            </label>
            {!loading && <span className="stitch-kicker whitespace-nowrap">{filtered.length} phim</span>}
          </div>
        </div>

        {loading ? (
          <div className="stitch-movie-grid">
            {[1,2,3,4,5,6,7,8].map((item) => <div key={item} className="stitch-card aspect-[2/3] animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="stitch-card p-12 text-center">
            <span className="material-symbols-outlined text-[52px]" style={{ color: 'var(--st-danger)' }}>error</span>
            <p className="mt-3 mb-6" style={{ color: 'var(--st-danger)' }}>{error}</p>
            <button className="stitch-btn stitch-btn-primary" onClick={() => void fetchMovies()}>Thử lại</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="stitch-card p-14 text-center stitch-muted">Không tìm thấy phim phù hợp.</div>
        ) : (
          <div className="stitch-movie-layout">
            <div className="stitch-movie-grid">
              {filtered.map((movie) => <MovieCard key={movie.movie_id} movie={movie} />)}
            </div>

            <aside className="stitch-movie-sidebar grid gap-6 sticky top-28">
              <div className="stitch-card p-6">
                <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color: 'var(--st-purple)' }}>local_fire_department</span>
                  Phim đang hot
                </h2>
                <div className="grid gap-5">
                  {hotMovies.map((movie, index) => (
                    <Link key={movie.movie_id} to={`/movies/${movie.movie_id}`} className="grid grid-cols-[62px_1fr] gap-3 items-center group">
                      <img
                        src={resolveAssetUrl(movie.poster_url) || FALLBACK_POSTER}
                        onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }}
                        alt={movie.title}
                        className="w-[62px] aspect-[2/3] rounded-lg object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold line-clamp-2 group-hover:text-secondary transition">{movie.title}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--st-gold)' }}>★ {(9.2 - index * .3).toFixed(1)}/10</p>
                        <p className="text-xs stitch-muted mt-1">Đang bán vé nhanh</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="stitch-card min-h-[310px] p-6 flex flex-col justify-end bg-gradient-to-b from-primary/10 to-black/80">
                <span className="stitch-badge stitch-badge-purple mb-auto">Ưu đãi thành viên</span>
                <h3 className="text-2xl font-extrabold leading-tight">Giảm 20% vé đôi thứ 3 hằng tuần</h3>
                <span className="stitch-kicker mt-4">Xem chi tiết →</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
