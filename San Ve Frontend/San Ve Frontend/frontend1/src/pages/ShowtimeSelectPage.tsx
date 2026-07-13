// src/pages/ShowtimeSelectPage.tsx

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";
import EmptyShowtime from "../components/showtime/EmptyShowtime";
import axiosClient from "../api/axiosClient";

type Cinema = { id: number; name: string; address: string };

type Showtime = {
  showtimeId: number;
  cinemaId: number;
  cinemaName: string;
  roomName: string;
  startTime: string;
  endTime: string;
};

type MockMovie = typeof mockMovies[number];

const cinemas: Cinema[] = [
  { id: 1, name: "CMC Cinema Hà Nội",  address: "123 Nguyễn Trãi, Hà Nội" },
  { id: 2, name: "CMC Cinema Đà Nẵng", address: "45 Trần Phú, Đà Nẵng" },
  { id: 3, name: "CMC Cinema HCM",     address: "99 Lý Tự Trọng, TP.HCM" },
];

function buildMockShowtimes(movieId: string | undefined): Showtime[] {
  if (!movieId) return [];
  const result: Showtime[] = [];
  let id = 1;
  cinemas.forEach((cinema) => {
    [0, 1, 2].forEach((dayOffset) => {
      const hoursToAdd = dayOffset === 0 ? [2, 4, 6, 8] : [9, 12.5, 16, 20.25];
      hoursToAdd.forEach((hoursFromNow) => {
        let start: Date;
        if (dayOffset === 0) {
          start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
        } else {
          start = new Date();
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() + dayOffset);
          start.setHours(Math.floor(hoursFromNow), (hoursFromNow % 1) * 60);
        }
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        result.push({
          showtimeId: id++,
          cinemaId: cinema.id,
          cinemaName: cinema.name,
          roomName: `Phòng ${id % 4 + 1}`,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
      });
    });
  });
  return result;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const getDayLabel = (dateStr: string) => {
  const date     = new Date(dateStr);
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime())    return "Hôm nay";
  if (date.getTime() === tomorrow.getTime()) return "Ngày mai";
  return date.toLocaleDateString("vi-VN", { weekday: "short" });
};

const isPast = (iso: string) => new Date(iso) < new Date();

export default function ShowtimeSelectPage() {
  const { movieId } = useParams();
  const navigate    = useNavigate();
  const { darkMode } = useTheme();

  const mockMovie = mockMovies.find((m) => String(m.movie_id) === movieId);
  const [movie, setMovie] = useState<MockMovie | null>(mockMovie ?? null);
  const [loadingMovie, setLoadingMovie] = useState(!mockMovie);

  useEffect(() => {
    if (mockMovie) {
      const t = setTimeout(() => {
        setMovie(mockMovie);
        setLoadingMovie(false);
      }, 0);
      return () => clearTimeout(t);
    }
    if (!movieId) {
      const t = setTimeout(() => setLoadingMovie(false), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    axiosClient.get(`/movies/${movieId}`)
      .then((res) => {
        if (cancelled) return;
        const raw = (res as unknown) as { data?: Record<string, unknown> };
        const m = (raw?.data ?? res) as Record<string, unknown>;
        const fetched: MockMovie = {
          movie_id: Number(m.movie_id ?? movieId),
          title: String(m.title ?? ''),
          poster_url: String(m.poster_url ?? ''),
          backdrop_url: String(m.backdrop_url ?? ''),
          trailer_url: String(m.trailer_url ?? ''),
          age_rating: String(m.age_rating ?? ''),
          duration_minutes: Number(m.duration_minutes ?? 0),
          genres: Array.isArray(m.genres) ? (m.genres as string[]) : [],
          description: String(m.description ?? ''),
          release_date: String(m.release_date ?? ''),
          status: (m.status as MockMovie['status']) ?? 'NOW_SHOWING',
          featured: Boolean(m.featured ?? false),
        };
        setMovie(fetched);
      })
      .catch(() => { /* không có trong API cũng không crash */ })
      .finally(() => { if (!cancelled) setLoadingMovie(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  const [allShowtimes, setAllShowtimes]         = useState<Showtime[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [selectedDate, setSelectedDate]         = useState<string | null>(null);
  const [usingMockShowtimes, setUsingMockShowtimes] = useState(false);

  const movieIdRef = useRef(movieId);
  useLayoutEffect(() => {
    movieIdRef.current = movieId;
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingShowtimes(true);
      setSelectedDate(null);

      try {
        const raw = await axiosClient.get(`/showtimes?movieId=${movieIdRef.current}`);
        const data = ((raw as unknown) as { data?: unknown })?.data ?? raw as unknown;
        const list: Showtime[] = Array.isArray(data)
          ? (data as Showtime[])
          : Array.isArray((data as Record<string, unknown>)?.data)
          ? ((data as Record<string, unknown>).data as Showtime[])
          : [];

        if (cancelled) return;

        if (list.length > 0) {
          setAllShowtimes(list);
          setUsingMockShowtimes(false);
        } else {
          setAllShowtimes(buildMockShowtimes(movieIdRef.current));
          setUsingMockShowtimes(true);
        }
      } catch {
        if (cancelled) return;
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        if (cancelled) return;
        setAllShowtimes(buildMockShowtimes(movieIdRef.current));
        setUsingMockShowtimes(true);
      } finally {
        if (!cancelled) setLoadingShowtimes(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [movieId]);

  const availableDates = useMemo(() => {
    const set = new Set(allShowtimes.map((s) => s.startTime.split("T")[0]));
    return Array.from(set).sort();
  }, [allShowtimes]);

  const didSetDefault = useRef(false);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate && !didSetDefault.current) {
      didSetDefault.current = true;
      const t = setTimeout(() => setSelectedDate(availableDates[0]), 0);
      return () => clearTimeout(t);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    didSetDefault.current = false;
  }, [movieId]);

  const filtered = useMemo(() => {
    return allShowtimes.filter((s) =>
      selectedDate ? s.startTime.startsWith(selectedDate) : true
    );
  }, [allShowtimes, selectedDate]);

  const groupedByCinema = useMemo(() => {
    const map: Record<string, Showtime[]> = {};
    filtered.forEach((s) => {
      if (!map[s.cinemaName]) map[s.cinemaName] = [];
      map[s.cinemaName].push(s);
    });
    return map;
  }, [filtered]);

  // FIX: navigate đúng sang /movies/:id/seats thay vì /movies/:id/seats (path không tồn tại trước đây)
  const handleSelectShowtime = (s: Showtime) => {
    if (isPast(s.startTime)) return;
    const date = s.startTime.split('T')[0];
    const time = formatTime(s.startTime);
    navigate(
      `/movies/${movieId}/seats` +
      `?showtimeId=${s.showtimeId}` +
      `&cinema=${encodeURIComponent(s.cinemaName)}` +
      `&room=${encodeURIComponent(s.roomName)}` +
      `&date=${encodeURIComponent(date)}` +
      `&time=${encodeURIComponent(time)}`
    );
  };

  const bg     = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card   = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow';
  const muted  = darkMode ? 'text-gray-400' : 'text-gray-500';
  const accent = 'text-amber-400';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Backdrop */}
      {movie?.backdrop_url && (
        <div className="relative w-full h-48 md:h-72 overflow-hidden">
          <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Movie info */}
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
            <img src={movie.poster_url} alt={movie.title} className="w-24 rounded-xl shadow-lg flex-shrink-0" />
            <div>
              <h1 className={`text-2xl font-bold ${accent}`}>{movie.title}</h1>
              {movie.age_rating && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-red-600 text-white font-semibold">{movie.age_rating}</span>
              )}
              {movie.duration_minutes > 0 && (
                <p className={`text-sm mt-1 ${muted}`}>{movie.duration_minutes} phút</p>
              )}
              {movie.genres?.length > 0 && (
                <p className={`text-xs mt-1 ${muted}`}>{movie.genres.join(' • ')}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Date selector */}
        {loadingShowtimes ? (
          <div className="flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-16 h-14 rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : availableDates.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Chọn ngày</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all ${
                    selectedDate === date
                      ? 'bg-amber-500 text-gray-950 font-semibold shadow-lg'
                      : darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-xs">{getDayLabel(date)}</div>
                  <div className="text-sm font-medium">{formatDate(date)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Showtimes grouped by cinema */}
        {loadingShowtimes ? (
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="rounded-2xl p-4 bg-gray-800 animate-pulse h-32" />
            ))}
          </div>
        ) : Object.keys(groupedByCinema).length === 0 ? (
          <EmptyShowtime />
        ) : (
          <div className="space-y-6">
            {usingMockShowtimes && (
              <div className="rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                ℹ️ Đang hiển thị suất chiếu mẫu.
              </div>
            )}
            {Object.entries(groupedByCinema).map(([cinemaName, showtimes]) => (
              <div key={cinemaName} className={`rounded-2xl p-4 md:p-6 ${card}`}>
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
                        {/* Hiển thị tên phòng chiếu trên mỗi nút */}
                        <span className={`text-xs mt-0.5 ${
                          past ? 'text-gray-600' : 'text-gray-800 opacity-70'
                        }`}>{s.roomName}</span>
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
