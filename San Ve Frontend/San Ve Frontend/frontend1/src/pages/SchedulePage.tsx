import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMovies } from '../api/movieApi';
import { getAllShowtimes, toLocalTime } from '../api/showtimeApi';
import type { Movie } from '../types/movie';
import type { Showtime } from '../types/showtime';

const FALLBACK_POSTER = 'https://picsum.photos/seed/cmc-showtime/420/630';
const isPast = (iso: string) => new Date(iso) < new Date();
const shortWeekday = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' });
const day = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit' });
const month = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { month: '2-digit' });

export default function SchedulePage() {
  const navigate = useNavigate();
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [showtimeList, movieResult] = await Promise.all([
          getAllShowtimes(),
          getMovies({ page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        setShowtimes(showtimeList.filter((item) => item.status === 'OPEN' && item.id > 0 && !isPast(item.startTime)));
        setMovies(movieResult.items);
      } catch (reason: unknown) {
        if (!cancelled) setError((reason as { message?: string })?.message || 'Không tải được lịch chiếu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const movieMap = useMemo(() => new Map(movies.map((movie) => [movie.movie_id, movie])), [movies]);
  const availableDates = useMemo(() => Array.from(new Set(showtimes.map((item) => item.showDate).filter(Boolean))).sort(), [showtimes]);
  const activeDate = selectedDate ?? availableDates[0] ?? null;

  const byMovie = useMemo(() => {
    const map = new Map<number, { title: string; cinemas: Map<number, { name: string; items: Showtime[] }> }>();
    showtimes.filter((item) => item.showDate === activeDate).forEach((item) => {
      const fallbackTitle = movieMap.get(item.movieId)?.title || `Phim #${item.movieId}`;
      if (!map.has(item.movieId)) map.set(item.movieId, { title: item.movieTitle || fallbackTitle, cinemas: new Map() });
      const movie = map.get(item.movieId)!;
      const cinemaId = item.cinemaId ?? 0;
      if (!movie.cinemas.has(cinemaId)) movie.cinemas.set(cinemaId, { name: item.cinemaName || 'CMC Cinema', items: [] });
      movie.cinemas.get(cinemaId)!.items.push(item);
    });
    map.forEach((movie) => movie.cinemas.forEach((cinema) => cinema.items.sort((a, b) => a.startTime.localeCompare(b.startTime))));
    return Array.from(map.entries()).sort((a, b) => a[1].title.localeCompare(b[1].title, 'vi'));
  }, [showtimes, activeDate, movieMap]);

  const goToSeats = (showtime: Showtime) => {
    navigate(`/movies/${showtime.movieId}/seats?showtimeId=${showtime.id}&cinema=${encodeURIComponent(showtime.cinemaName)}&room=${encodeURIComponent(showtime.roomName)}&date=${encodeURIComponent(showtime.showDate)}&time=${encodeURIComponent(toLocalTime(showtime.startTime))}`);
  };

  return (
    <section className="stitch-page stitch-schedule-page">
      <div className="stitch-container">
        <div className="mb-9">
          <p className="stitch-kicker mb-3">Cinema schedule</p>
          <h1 className="stitch-page-title">Lịch chiếu phim</h1>
          <p className="stitch-muted mt-4">Chọn ngày, bộ phim và giờ chiếu phù hợp.</p>
        </div>

        {loading ? (
          <div className="grid gap-6"><div className="stitch-card h-24 animate-pulse" /><div className="stitch-card h-96 animate-pulse" /></div>
        ) : error ? (
          <div className="stitch-card p-12 text-center"><p style={{ color: 'var(--st-danger)' }}>{error}</p><button className="stitch-btn stitch-btn-primary mt-6" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></div>
        ) : !availableDates.length ? (
          <div className="stitch-card p-14 text-center"><span className="material-symbols-outlined text-[56px] stitch-muted">movie_off</span><h2 className="text-2xl font-bold mt-3">Chưa có suất chiếu</h2><Link to="/movies" className="stitch-btn stitch-btn-primary mt-7">Xem danh sách phim</Link></div>
        ) : (
          <>
            <div className="cgv-date-strip" aria-label="Chọn ngày chiếu">
              {availableDates.map((date) => (
                <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`cgv-date-tile ${activeDate === date ? 'active' : ''}`}>
                  <span className="cgv-date-month">{month(date)}</span>
                  <span className="cgv-date-weekday">{shortWeekday(date)}</span>
                  <strong>{day(date)}</strong>
                </button>
              ))}
            </div>

            <div className="cgv-movie-list">
              {byMovie.map(([movieId, group]) => {
                const movie = movieMap.get(movieId);
                return (
                  <article key={movieId} className="cgv-movie-row stitch-card">
                    <div className="cgv-movie-heading">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2>{movie?.title || group.title}</h2>
                          {movie?.age_rating && <span className="cgv-age-rating">{movie.age_rating}</span>}
                        </div>
                        <p>{movie?.genres?.join(' · ') || 'Đang cập nhật thể loại'}</p>
                      </div>
                      <Link to={`/movies/${movieId}`} className="stitch-btn stitch-btn-outline">Chi tiết</Link>
                    </div>

                    <div className="cgv-movie-content">
                      <img src={movie?.poster_url || FALLBACK_POSTER} alt={movie?.title || group.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_POSTER; }} />
                      <div className="cgv-showtime-groups">
                        {Array.from(group.cinemas.entries()).map(([cinemaId, cinema]) => (
                          <section key={cinemaId}>
                            <h3><span className="material-symbols-outlined">location_on</span>{cinema.name}</h3>
                            <p className="cgv-format-label">2D Phụ đề Việt · Phòng chiếu tiêu chuẩn</p>
                            <div className="cgv-time-grid">
                              {cinema.items.map((item) => (
                                <button key={item.id} type="button" onClick={() => goToSeats(item)}>
                                  <strong>{toLocalTime(item.startTime)}</strong>
                                  <span>{item.roomName}</span>
                                </button>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
