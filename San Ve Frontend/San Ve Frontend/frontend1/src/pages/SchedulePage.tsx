// src/pages/SchedulePage.tsx
//
// FIX Lỗi 4: mục "LỊCH CHIẾU" trên Navbar trước đây trỏ về "/" (trang chủ) —
// không hề có trang lịch chiếu tổng hợp nào. Backend đã có `GET /showtimes` và
// `showtimeApi.ts` đã export `getAllShowtimes()` nhưng phía người dùng chưa có
// trang nào dùng đến.
//
// Trang này gom suất chiếu thật theo ngày -> theo phim -> theo rạp.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllShowtimes, toLocalTime } from '../api/showtimeApi';
import { useTheme } from '../context/useTheme';
import type { Showtime } from '../types/showtime';

const dayLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === today.getTime()) return 'Hôm nay';
  if (date.getTime() === tomorrow.getTime()) return 'Ngày mai';
  return date.toLocaleDateString('vi-VN', { weekday: 'short' });
};

const dayNumber = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });

const isPast = (iso: string) => new Date(iso) < new Date();

export default function SchedulePage() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
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
        const list = await getAllShowtimes();
        if (cancelled) return;
        // Chỉ hiển thị suất còn bán được và chưa qua giờ chiếu
        setShowtimes(list.filter((s) => s.status === 'OPEN' && s.id > 0 && !isPast(s.startTime)));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            (err as { message?: string })?.message || 'Không tải được lịch chiếu. Vui lòng thử lại.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const availableDates = useMemo(
    () => Array.from(new Set(showtimes.map((s) => s.showDate).filter(Boolean))).sort(),
    [showtimes],
  );

  const activeDate = selectedDate ?? availableDates[0] ?? null;

  /** Suất chiếu của ngày đang chọn, gom theo phim rồi gom tiếp theo rạp */
  const byMovie = useMemo(() => {
    const forDay = showtimes.filter((s) => s.showDate === activeDate);
    const map = new Map<
      number,
      { movieTitle: string; cinemas: Map<number, { cinemaName: string; items: Showtime[] }> }
    >();

    forDay.forEach((s) => {
      if (!map.has(s.movieId)) {
        map.set(s.movieId, { movieTitle: s.movieTitle || `Phim #${s.movieId}`, cinemas: new Map() });
      }
      const movie = map.get(s.movieId)!;
      const cinemaKey = s.cinemaId ?? 0;
      if (!movie.cinemas.has(cinemaKey)) {
        movie.cinemas.set(cinemaKey, { cinemaName: s.cinemaName || 'Chưa rõ rạp', items: [] });
      }
      movie.cinemas.get(cinemaKey)!.items.push(s);
    });

    map.forEach((movie) =>
      movie.cinemas.forEach((c) =>
        c.items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ),
    );

    return Array.from(map.entries()).sort((a, b) => a[1].movieTitle.localeCompare(b[1].movieTitle, 'vi'));
  }, [showtimes, activeDate]);

  const goToSeats = (s: Showtime) => {
    navigate(
      `/movies/${s.movieId}/seats` +
        `?showtimeId=${s.id}` +
        `&cinema=${encodeURIComponent(s.cinemaName)}` +
        `&room=${encodeURIComponent(s.roomName)}` +
        `&date=${encodeURIComponent(s.showDate)}` +
        `&time=${encodeURIComponent(toLocalTime(s.startTime))}`,
    );
  };

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-2">📅 Lịch chiếu</h1>
        <p className={`text-sm mb-8 ${muted}`}>Toàn bộ suất chiếu sắp tới tại các rạp CMC Cinema</p>

        {loading ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-16 h-14 rounded-xl bg-gray-800/40 animate-pulse" />
              ))}
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-800/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              Thử lại
            </button>
          </div>
        ) : availableDates.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-gray-700">
            <p className="text-5xl mb-4">🎬</p>
            <h3 className="text-lg font-bold mb-2">Chưa có suất chiếu nào</h3>
            <p className={`text-sm mb-6 ${muted}`}>
              Hiện chưa có lịch chiếu sắp tới. Vui lòng quay lại sau.
            </p>
            <Link
              to="/movies"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
            >
              Xem danh sách phim
            </Link>
          </div>
        ) : (
          <>
            {/* Chọn ngày */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-center transition-all ${
                    activeDate === date
                      ? 'bg-blue-600 text-white font-semibold shadow-lg'
                      : darkMode
                        ? 'bg-gray-900 border border-gray-800 hover:border-gray-600 text-gray-300'
                        : 'bg-white border border-gray-200 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="text-xs">{dayLabel(date)}</div>
                  <div className="text-sm font-medium">{dayNumber(date)}</div>
                </button>
              ))}
            </div>

            {/* Suất chiếu gom theo phim */}
            <div className="space-y-5">
              {byMovie.map(([movieId, { movieTitle, cinemas }]) => (
                <div key={movieId} className={`rounded-2xl p-5 md:p-6 ${card}`}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-bold">{movieTitle}</h2>
                    <Link
                      to={`/movies/${movieId}`}
                      className="shrink-0 text-sm text-blue-500 hover:text-blue-400 font-semibold transition"
                    >
                      Chi tiết →
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {Array.from(cinemas.entries()).map(([cinemaId, { cinemaName, items }]) => (
                      <div key={cinemaId}>
                        <p className={`text-sm font-semibold mb-2 ${muted}`}>{cinemaName}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => goToSeats(s)}
                              className="flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-400 text-gray-950 shadow transition active:scale-95"
                            >
                              <span>{toLocalTime(s.startTime)}</span>
                              <span className="text-xs mt-0.5 text-gray-800 opacity-70">
                                {s.roomName}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
