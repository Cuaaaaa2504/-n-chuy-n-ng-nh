import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMovies } from '../services/movieService';

const statusOptions = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang chiếu', value: 'NOW_SHOWING' },
  { label: 'Sắp chiếu', value: 'COMING_SOON' },
];

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 8;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    let ignore = false;
    async function loadMovies() {
      setLoading(true); setError('');
      try {
        const result = await getMovies({ keyword: submittedKeyword, status, page, limit });
        if (!ignore) { setMovies(result.movies); setTotal(result.total); }
      } catch (err) {
        if (!ignore) { setError(err.message || 'Không tải được danh sách phim'); setMovies([]); setTotal(0); }
      } finally { if (!ignore) setLoading(false); }
    }
    loadMovies();
    return () => { ignore = true; };
  }, [submittedKeyword, status, page]);

  const handleSubmit = (e) => { e.preventDefault(); setPage(1); setSubmittedKeyword(keyword); };
  const clearSearch = () => { setKeyword(''); setSubmittedKeyword(''); setPage(1); };

  return (
    <main className="container">
      <h1>Danh sách phim</h1>
      <form className="toolbar" onSubmit={handleSubmit}>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm tên phim..." />
        <button type="submit">Tìm kiếm</button>
        <button type="button" onClick={clearSearch}>Xóa</button>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </form>

      {loading && <p>Đang tải phim...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && movies.length === 0 && <p>Không có phim phù hợp.</p>}

      <div className="movie-grid">
        {movies.map((movie) => (
          <article className="movie-card" key={movie.id || movie._id}>
            <img src={movie.posterUrl || movie.poster || 'https://placehold.co/300x420?text=No+Poster'} alt={movie.title || movie.name} />
            <h3>{movie.title || movie.name}</h3>
            <p>{movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Đang chiếu'}</p>
            <Link className="button" to={`/movies/${movie.id || movie._id}`}>Xem chi tiết</Link>
          </article>
        ))}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</button>
        <span>Trang {page}/{totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Trang sau</button>
      </div>
    </main>
  );
}
