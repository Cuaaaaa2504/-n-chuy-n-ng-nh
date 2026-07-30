import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMovieById } from '../api/movieApi';
import type { Movie } from '../types/movie';
import { resolveAssetUrl } from '../utils/assetUrl';

const FALLBACK_POSTER = 'https://picsum.photos/seed/cmc-detail-poster/600/900';
const FALLBACK_BACKDROP = 'https://picsum.photos/seed/cmc-detail-backdrop/1800/1000';
const STATUS_LABEL: Record<string, string> = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  ENDED: 'Đã kết thúc',
  HIDDEN: 'Đã ẩn',
};

function getYoutubeEmbedUrl(url?: string) {
  if (!url) return null;
  const match = url.match(/(?:watch\?v=|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMovieById(Number(id));
        if (!cancelled) setMovie(result);
      } catch (reason: unknown) {
        if (!cancelled) setError((reason as { message?: string })?.message || 'Không tải được thông tin phim');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="stitch-container py-16"><div className="stitch-card h-[680px] animate-pulse" /></div>;
  }

  if (error || !movie) {
    return (
      <section className="stitch-page grid place-items-center">
        <div className="stitch-card p-12 text-center max-w-xl">
          <span className="material-symbols-outlined text-[56px] stitch-muted">movie_off</span>
          <h1 className="text-3xl font-extrabold mt-4">Không tìm thấy phim</h1>
          {error && <p className="stitch-muted mt-3">{error}</p>}
          <Link to="/movies" className="stitch-btn stitch-btn-primary mt-7">Về danh sách phim</Link>
        </div>
      </section>
    );
  }

  const trailerEmbedUrl = getYoutubeEmbedUrl(movie.trailer_url);
  const poster = resolveAssetUrl(movie.poster_url) || FALLBACK_POSTER;
  const backdrop = resolveAssetUrl(movie.backdrop_url || movie.poster_url) || FALLBACK_BACKDROP;
  const year = movie.release_year || (movie.release_date ? movie.release_date.slice(0, 4) : null);
  const rawRating = movie.imdb_rating ?? movie.average_rating;
  const numericRating = rawRating == null ? null : Number(rawRating);
  const rating = numericRating !== null && Number.isFinite(numericRating) ? numericRating.toFixed(1) : '8.5';

  return (
    <div>
      <section className="stitch-detail-hero">
        <img className="backdrop" src={backdrop} alt="" onError={(event) => { event.currentTarget.src = FALLBACK_BACKDROP; }} />
        <div className="stitch-detail-overlay" />
        <div className="stitch-detail-content">
          <img className="stitch-detail-poster" src={poster} alt={movie.title} onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }} />
          <div>
            <button type="button" onClick={() => navigate(-1)} className="stitch-kicker inline-flex items-center gap-2 mb-5 hover:text-secondary">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>Quay lại
            </button>
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.age_rating && <span className="stitch-badge stitch-badge-purple">{movie.age_rating}</span>}
              <span className="stitch-badge stitch-badge-cyan">{STATUS_LABEL[movie.status] || movie.status}</span>
              {year && <span className="stitch-badge border border-white/20 text-white/80">{year}</span>}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-[-.055em] leading-[.95] text-white max-w-4xl">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-5 text-sm">
              <span className="inline-flex items-center gap-1" style={{ color: 'var(--st-gold)' }}><span className="material-symbols-outlined text-[18px]">star</span>{rating}/10</span>
              <span className="inline-flex items-center gap-1 text-white/75"><span className="material-symbols-outlined text-[18px]">schedule</span>{movie.duration_minutes} phút</span>
              <span className="text-white/65">{movie.genres?.join(' • ') || 'Đang cập nhật thể loại'}</span>
            </div>
            <p className="mt-6 max-w-3xl text-white/72 leading-7 line-clamp-4">{movie.description || 'Đang cập nhật nội dung phim...'}</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button type="button" onClick={() => navigate(`/showtimes/${movie.movie_id}`)} className="stitch-btn stitch-btn-primary">
                <span className="material-symbols-outlined">confirmation_number</span>Đặt vé ngay
              </button>
              {movie.trailer_url && (
                <a href={movie.trailer_url} target="_blank" rel="noreferrer" className="stitch-btn stitch-btn-outline">
                  <span className="material-symbols-outlined">play_circle</span>Xem trailer
                </a>
              )}
              <button type="button" className="stitch-btn stitch-btn-outline"><span className="material-symbols-outlined">favorite</span>Yêu thích</button>
            </div>
          </div>
        </div>
      </section>

      <section className="stitch-container py-16">
        <div className="stitch-detail-grid">
          <div className="grid gap-6">
            <article className="stitch-card p-7">
              <p className="stitch-kicker mb-3">Synopsis</p>
              <h2 className="text-3xl font-extrabold mb-5">Nội dung phim</h2>
              <p className="stitch-muted leading-8 whitespace-pre-line">{movie.description || 'Đang cập nhật nội dung phim...'}</p>
            </article>

            {trailerEmbedUrl ? (
              <article className="stitch-card p-7">
                <div className="flex justify-between items-center gap-4 mb-5">
                  <div><p className="stitch-kicker mb-2">Official trailer</p><h2 className="text-3xl font-extrabold">Trailer</h2></div>
                  <a className="stitch-kicker hover:text-secondary" href={movie.trailer_url} target="_blank" rel="noreferrer">Mở YouTube ↗</a>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                  <iframe src={trailerEmbedUrl} title={`${movie.title} trailer`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </article>
            ) : (
              <article className="stitch-card p-7"><h2 className="text-2xl font-extrabold">Trailer</h2><p className="stitch-muted mt-3">Hiện chưa có trailer cho phim này.</p></article>
            )}
          </div>

          <aside className="grid gap-6 content-start sticky top-28">
            <article className="stitch-card p-6">
              <p className="stitch-kicker mb-4">Movie data</p>
              <dl className="grid gap-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="stitch-muted">Thời lượng</dt><dd className="font-semibold">{movie.duration_minutes} phút</dd></div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="stitch-muted">Phân loại</dt><dd className="font-semibold">{movie.age_rating}</dd></div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="stitch-muted">Trạng thái</dt><dd className="font-semibold">{STATUS_LABEL[movie.status] || movie.status}</dd></div>
                <div className="grid gap-2"><dt className="stitch-muted">Thể loại</dt><dd className="flex flex-wrap gap-2">{movie.genres?.map((genre) => <span key={genre} className="stitch-badge border border-white/10" style={{ color: 'var(--st-purple)', background: 'var(--st-panel-light)' }}>{genre}</span>)}</dd></div>
              </dl>
            </article>
            <article className="stitch-card p-6">
              <p className="stitch-kicker mb-3">Quick action</p>
              <h3 className="text-2xl font-extrabold mb-5">Chọn suất chiếu gần nhất</h3>
              <button type="button" onClick={() => navigate(`/showtimes/${movie.movie_id}`)} className="stitch-btn stitch-btn-primary w-full">Mua vé</button>
            </article>
          </aside>
        </div>
      </section>
    </div>
  );
}
