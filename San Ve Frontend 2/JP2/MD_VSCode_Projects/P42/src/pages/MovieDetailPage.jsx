import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function normalizeMovie(payload) {
  return payload?.data || payload?.item || payload || null;
}

export default function MovieDetailPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadMovie() {
      setLoading(true);
      setError('');
      try {
        const payload = await axiosClient.get(`/movies/${movieId}`);
        if (!ignore) setMovie(normalizeMovie(payload));
      } catch (err) {
        if (!ignore) setError(err.message || 'Không tải được chi tiết phim');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadMovie();
    return () => { ignore = true; };
  }, [movieId]);

  if (loading) return <section className="page"><h1>Chi tiết phim</h1><p>Đang tải...</p></section>;
  if (error) return <section className="page"><h1>Chi tiết phim</h1><p className="error">{error}</p></section>;

  const title = movie?.title || movie?.name || 'Phim chưa có tên';
  const genres = Array.isArray(movie?.genres) ? movie.genres.join(', ') : movie?.genres || movie?.genre || 'Chưa cập nhật';
  const duration = movie?.duration || movie?.durationMinutes || movie?.runtime || 'Chưa cập nhật';

  return (
    <section className="page">
      <h1>{title}</h1>
      <div className="panel">
        {movie?.posterUrl && <img className="poster-small" src={movie.posterUrl} alt={title} />}
        <p><b>Mã phim:</b> {movieId}</p>
        <p><b>Thể loại:</b> {genres}</p>
        <p><b>Thời lượng:</b> {duration} phút</p>
        <p>{movie?.description || movie?.overview || 'Chưa có mô tả phim.'}</p>
        <button onClick={() => navigate(`/booking/${movieId}`)}>Đặt vé</button>
      </div>
    </section>
  );
}
