// src/pages/ShowtimeSelectPage.tsx
// FIX Lỗi 2: bỏ `mockMovies` — trang không còn tra cứu phim trong mảng giả trước
//   rồi mới gọi API. Luồng nay đúng chiều: API là nguồn duy nhất.
// FIX Lỗi 3: bỏ hoàn toàn `buildMockShowtimes()` và mảng `cinemas` hardcode.
//   Trước đây khi API trả [] (phim chưa có suất chiếu) trang tự dựng suất chiếu
//   giả với showtimeId đếm từ 1 — người dùng bấm "Mua vé" là gặp lỗi vì id đó
//   không tồn tại trong DB. Nay không có suất chiếu thì hiển thị EmptyShowtime.
// FIX Lỗi 5: bỏ đoạn tự unwrap `raw?.data ?? res` + map key snake_case từ
//   response camelCase (khiến poster/age rating/trailer luôn undefined).
//   Dùng `getMovieById()` — đã normalize sẵn trong movieApi.ts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmptyShowtime from '../components/showtime/EmptyShowtime';
import { getMovieById } from '../api/movieApi';
import { getShowtimesByMovie } from '../api/showtimeApi';
import type { Movie } from '../types/movie';
import { resolveAssetUrl } from '../utils/assetUrl';

type UiShowtime = {
  showtimeId: number;
  cinemaId: number;
  cinemaName: string;
  roomName: string;
  startTime: string;
  endTime: string;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const getDayLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return 'Hôm nay';
  if (date.getTime() === tomorrow.getTime()) return 'Ngày mai';
  return date.toLocaleDateString('vi-VN', { weekday: 'short' });
};

const isPast = (iso: string) => new Date(iso) < new Date();

export default function ShowtimeSelectPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();

  // ── Thông tin phim ───────────────────────────────────────────────────────
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loadingMovie, setLoadingMovie] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!movieId) {
        setLoadingMovie(false);
        return;
      }
      setLoadingMovie(true);
      try {
        const m = await getMovieById(Number(movieId));
        if (!cancelled) setMovie(m);
      } catch {
        if (!cancelled) setMovie(null);
      } finally {
        if (!cancelled) setLoadingMovie(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  // ── Suất chiếu ───────────────────────────────────────────────────────────
  const [allShowtimes, setAllShowtimes] = useState<UiShowtime[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [showtimeError, setShowtimeError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadShowtimes = useMemo(
    () => async (signal: { cancelled: boolean }) => {
      if (!movieId) {
        setLoadingShowtimes(false);
        return;
      }
      setLoadingShowtimes(true);
      setShowtimeError(null);
      try {
        const apiList = await getShowtimesByMovie(Number(movieId));
        if (signal.cancelled) return;
        setAllShowtimes(
          apiList
            // Suất chiếu đã huỷ không được bán vé.
            // Lọc luôn suất đã qua giờ bắt đầu. Trước đây chúng vẫn
            // nằm trong danh sách, chỉ bị disable + gạch ngang -> với phim chiếu
            // nhiều ngày thì giao diện đầy nút chết, user phải tự đoán nút nào
            // còn bấm được. Ngày nào hết suất thì cũng không còn hiện ở thanh chọn ngày.
            .filter((s) => s.status !== 'CANCELLED' && s.id > 0 && !isPast(s.startTime))
            .map((s) => ({
              showtimeId: s.id,
              cinemaId: s.cinemaId ?? 0,
              cinemaName: s.cinemaName || 'Chưa rõ rạp',
              roomName: s.roomName || 'Chưa rõ phòng',
              startTime: s.startTime,
              endTime: s.endTime,
            })),
        );
      } catch (err) {
        if (signal.cancelled) return;
        // FIX Lỗi 3: lỗi mạng thì báo lỗi thật, KHÔNG dựng suất chiếu giả
        setShowtimeError(
          (err as { message?: string })?.message || 'Không tải được lịch chiếu. Vui lòng thử lại.',
        );
        setAllShowtimes([]);
      } finally {
        if (!signal.cancelled) setLoadingShowtimes(false);
      }
    },
    [movieId],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void (async () => {
      setSelectedDate(null);
      await loadShowtimes(signal);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [loadShowtimes]);

  const availableDates = useMemo(() => {
    const set = new Set(allShowtimes.map((s) => s.startTime.split('T')[0]));
    return Array.from(set).sort();
  }, [allShowtimes]);

  const didSetDefault = useRef(false);
  useEffect(() => {
    didSetDefault.current = false;
  }, [movieId]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate && !didSetDefault.current) {
      didSetDefault.current = true;
      const t = setTimeout(() => setSelectedDate(availableDates[0]), 0);
      return () => clearTimeout(t);
    }
  }, [availableDates, selectedDate]);

  const filtered = useMemo(
    () =>
      allShowtimes.filter((s) => (selectedDate ? s.startTime.startsWith(selectedDate) : true)),
    [allShowtimes, selectedDate],
  );

  // Group theo cinemaId (ổn định) thay vì cinemaName — tránh gộp nhầm khi trùng tên
  const groupedByCinema = useMemo(() => {
    const map = new Map<number, { cinemaName: string; showtimes: UiShowtime[] }>();
    filtered.forEach((s) => {
      const group = map.get(s.cinemaId);
      if (group) group.showtimes.push(s);
      else map.set(s.cinemaId, { cinemaName: s.cinemaName, showtimes: [s] });
    });
    map.forEach((g) => g.showtimes.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return Array.from(map.entries());
  }, [filtered]);

  const handleSelectShowtime = (s: UiShowtime) => {
    if (isPast(s.startTime) || !s.showtimeId) return;
    const date = s.startTime.split('T')[0];
    const time = formatTime(s.startTime);
    navigate(
      `/movies/${movieId}/seats` +
        `?showtimeId=${s.showtimeId}` +
        `&cinema=${encodeURIComponent(s.cinemaName)}` +
        `&room=${encodeURIComponent(s.roomName)}` +
        `&date=${encodeURIComponent(date)}` +
        `&time=${encodeURIComponent(time)}`,
    );
  };

  const fallbackBackdrop = 'https://picsum.photos/seed/cmc-showtime/1800/900';
  const backdrop = resolveAssetUrl(movie?.backdrop_url || movie?.poster_url) || fallbackBackdrop;

  return (
    <section className="stitch-page">
      <div className="stitch-container">
        {loadingMovie ? (
          <div className="stitch-card h-[430px] animate-pulse mb-10" />
        ) : movie ? (
          <div className="stitch-showtime-hero">
            <img src={backdrop} alt="" onError={(event) => { event.currentTarget.src = fallbackBackdrop; }} />
            <div className="stitch-showtime-meta">
              <div className="flex flex-wrap gap-2 mb-3">
                {movie.genres?.slice(0, 2).map((genre) => <span key={genre} className="stitch-badge stitch-badge-gold">{genre}</span>)}
                {movie.age_rating && <span className="stitch-badge stitch-badge-purple">{movie.age_rating}</span>}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-.05em] text-white">{movie.title}</h1>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/75">
                <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">schedule</span>{movie.duration_minutes} phút</span>
                <span className="inline-flex items-center gap-1" style={{ color: 'var(--st-gold)' }}><span className="material-symbols-outlined text-[18px]">star</span>Đang mở bán</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="stitch-showtime-layout">
          <aside className="grid gap-5 sticky top-28">
            <div className="stitch-card p-5">
              <h2 className="text-xl font-extrabold mb-5">Ngày chiếu</h2>
              {loadingShowtimes ? (
                <div className="grid gap-3">{[1,2,3].map((item) => <div key={item} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
              ) : (
                <div className="stitch-date-list">
                  {availableDates.map((date) => (
                    <button key={date} type="button" className={`stitch-date-button ${selectedDate === date ? 'active' : ''}`} onClick={() => setSelectedDate(date)}>
                      <strong className="block">{getDayLabel(date)}</strong>
                      <span className="text-sm stitch-muted">{formatDate(date)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="stitch-card p-5">
              <h2 className="text-xl font-extrabold mb-4">Định dạng</h2>
              <div className="flex flex-wrap gap-2">
                {['Tất cả', 'IMAX Laser', '4DX', '2D Phụ đề'].map((label, index) => (
                  <span key={label} className={`stitch-badge ${index === 0 ? 'stitch-badge-purple' : ''} border border-white/10`} style={index ? { color: 'var(--st-muted)', background: 'var(--st-panel-light)' } : undefined}>{label}</span>
                ))}
              </div>
            </div>
          </aside>

          <div>
            {loadingShowtimes ? (
              <div className="grid gap-6">{[1,2].map((item) => <div key={item} className="stitch-card h-64 animate-pulse" />)}</div>
            ) : showtimeError ? (
              <div className="stitch-card p-10 text-center">
                <span className="material-symbols-outlined text-[50px]" style={{ color: 'var(--st-danger)' }}>error</span>
                <p className="mt-3 mb-6" style={{ color: 'var(--st-danger)' }}>{showtimeError}</p>
                <button className="stitch-btn stitch-btn-primary" onClick={() => { const signal = { cancelled: false }; void loadShowtimes(signal); }}>Thử lại</button>
              </div>
            ) : groupedByCinema.length === 0 ? (
              <EmptyShowtime />
            ) : (
              <div className="grid gap-6">
                {groupedByCinema.map(([cinemaId, cinema]) => (
                  <article key={cinemaId} className="stitch-cinema-card">
                    <header className="stitch-cinema-head">
                      <div className="flex gap-3 items-start">
                        <span className="material-symbols-outlined mt-1" style={{ color: 'var(--st-purple)' }}>location_on</span>
                        <div>
                          <h2 className="text-2xl font-extrabold">{cinema.cinemaName}</h2>
                          <p className="stitch-muted text-sm mt-1">Hệ thống phòng chiếu CMC Cinema</p>
                        </div>
                      </div>
                    </header>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="stitch-badge stitch-badge-purple">2D</span>
                        <span className="stitch-muted text-sm">Phụ đề tiếng Việt</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {cinema.showtimes.map((showtime) => (
                          <button
                            key={showtime.showtimeId}
                            type="button"
                            className="stitch-time-button"
                            disabled={isPast(showtime.startTime)}
                            onClick={() => handleSelectShowtime(showtime)}
                          >
                            <strong className="block">{formatTime(showtime.startTime)}</strong>
                            <span className="text-[10px] stitch-muted">{showtime.roomName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
