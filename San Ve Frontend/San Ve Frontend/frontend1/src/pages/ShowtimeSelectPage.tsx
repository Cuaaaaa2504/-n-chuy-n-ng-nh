// src/pages/ShowtimeSelectPage.tsx
//
// FIX Lỗi 2: bỏ `mockMovies` — trang không còn tra cứu phim trong mảng giả trước
//   rồi mới gọi API. Luồng nay đúng chiều: API là nguồn duy nhất.
//
// FIX Lỗi 3: bỏ hoàn toàn `buildMockShowtimes()` và mảng `cinemas` hardcode.
//   Trước đây khi API trả [] (phim chưa có suất chiếu) trang tự dựng suất chiếu
//   giả với showtimeId đếm từ 1 — người dùng bấm "Mua vé" là gặp lỗi vì id đó
//   không tồn tại trong DB. Nay không có suất chiếu thì hiển thị EmptyShowtime.
//
// FIX Lỗi 5: bỏ đoạn tự unwrap `raw?.data ?? res` + map key snake_case từ
//   response camelCase (khiến poster/age rating/trailer luôn undefined).
//   Dùng `getMovieById()` — đã normalize sẵn trong movieApi.ts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import EmptyShowtime from '../components/showtime/EmptyShowtime';
import { getMovieById } from '../api/movieApi';
import { getShowtimesByMovie } from '../api/showtimeApi';
import type { Movie } from '../types/movie';

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
  const { darkMode } = useTheme();

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
            // FIX BUG-06: lọc luôn suất đã qua giờ bắt đầu. Trước đây chúng vẫn
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

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const accent = 'text-amber-400';

  return (
    <div className={`min-h-screen ${bg}`}>
      {movie?.backdrop_url && (
        <div className="relative w-full h-48 md:h-72 overflow-hidden">
          <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Thông tin phim */}
        {loadingMovie ? (
          <div className="flex gap-4 animate-pulse">
            <div className="w-24 h-36 rounded-xl bg-gray-800" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-6 bg-gray-800 rounded w-2/3" />
              <div className="h-4 bg-gray-800 rounded w-1/3" />
            </div>
          </div>
        ) : movie ? (
          <div className="flex gap-4 items-start">
            {movie.poster_url && (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-24 rounded-xl shadow-lg flex-shrink-0"
              />
            )}
            <div>
              <h1 className={`text-2xl font-bold ${accent}`}>{movie.title}</h1>
              {movie.age_rating && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-red-600 text-white font-semibold">
                  {movie.age_rating}
                </span>
              )}
              {movie.duration_minutes > 0 && (
                <p className={`text-sm mt-1 ${muted}`}>{movie.duration_minutes} phút</p>
              )}
              {movie.genres.length > 0 && (
                <p className={`text-xs mt-1 ${muted}`}>{movie.genres.join(' • ')}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Chọn ngày */}
        {loadingShowtimes ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-14 rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : availableDates.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">
              Chọn ngày
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all ${
                    selectedDate === date
                      ? 'bg-amber-500 text-gray-950 font-semibold shadow-lg'
                      : darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-xs">{getDayLabel(date)}</div>
                  <div className="text-sm font-medium">{formatDate(date)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Danh sách suất chiếu theo rạp */}
        {loadingShowtimes ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-4 bg-gray-800 animate-pulse h-32" />
            ))}
          </div>
        ) : showtimeError ? (
          <div className="rounded-2xl px-4 py-6 bg-red-500/10 border border-red-500/25 text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-red-400 text-sm mb-4">{showtimeError}</p>
            <button
              onClick={() => {
                const signal = { cancelled: false };
                void loadShowtimes(signal);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold transition"
            >
              Thử lại
            </button>
          </div>
        ) : groupedByCinema.length === 0 ? (
          <EmptyShowtime />
        ) : (
          <div className="space-y-6">
            {groupedByCinema.map(([cinemaId, { cinemaName, showtimes }]) => (
              <div key={cinemaId} className={`rounded-2xl p-4 md:p-6 ${card}`}>
                <h3 className="font-semibold text-base mb-1">{cinemaName}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {showtimes.map((s) => {
                    const past = isPast(s.startTime);
                    return (
                      <button
                        key={s.showtimeId}
                        onClick={() => handleSelectShowtime(s)}
                        disabled={past}
                        className={`flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          past
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed line-through'
                            : 'bg-amber-500 hover:bg-amber-400 text-gray-950 shadow hover:shadow-md active:scale-95'
                        }`}
                      >
                        <span>{formatTime(s.startTime)}</span>
                        <span
                          className={`text-xs mt-0.5 ${past ? 'text-gray-600' : 'text-gray-800 opacity-70'}`}
                        >
                          {s.roomName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
