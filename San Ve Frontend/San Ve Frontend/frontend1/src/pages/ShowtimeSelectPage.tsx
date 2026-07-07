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

  // FIX react-hooks/set-state-in-effect: setMovie trong effect nhưng dùng cleanup pattern
  // FIX TS2345 & TS2352: dùng đúng type MockMovie thay vì cast về undefined
  useEffect(() => {
    if (mockMovie) {
      setMovie(mockMovie);
      setLoadingMovie(false);
      return;
    }
    if (!movieId) { setLoadingMovie(false); return; }
    let cancelled = false;
    axiosClient.get(`/movies/${movieId}`)
      .then((res) => {
        if (cancelled) return;
        const raw = res as Record<string, unknown>;
        const m = (raw?.data ?? raw) as Record<string, unknown>;
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
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
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
        const data = (raw as Record<string, unknown>)?.data ?? raw as unknown;
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
    let list = allShowtimes.filter((s) =>
      selectedDate ? s.startTime.startsWith(selectedDate) : true
    );
    if (selectedCinemaId) list = list.filter((s) => s.cinemaId === selectedCinemaId);
    return list;
  }, [allShowtimes, selectedDate, selectedCinemaId]);

  const groupedByCinema = useMemo(() => {
    const map: Record<string, Showtime[]> = {};
    filtered.forEach((s) => {
      if (!map[s.cinemaName]) map[s.cinemaName] = [];
      map[s.cinemaName].push(s);
    });
    return map;
  }, [filtered]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(selectedDate));
  }, [selectedDate]);

  const card = darkMode
    ? "bg-gray-900 border border-gray-800"
    : "bg-white shadow";

  if (loadingMovie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Không tìm thấy phim</h1>
          <button onClick={() => navigate(-1)} className="bg-red-500 text-white px-5 py-2 rounded-lg">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-10 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Chọn suất chiếu</h1>
          <p className={darkMode ? "text-gray-400 mt-1" : "text-gray-600 mt-1"}>{movie.title}</p>
        </div>
        <button
          onClick={() => navigate(`/movies/${movie.movie_id}`)}
          className="px-4 py-2 rounded-xl border font-semibold"
        >
          Quay lại phim
        </button>
      </div>

      {usingMockShowtimes && (
        <div className="mb-4 rounded-xl px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
          ⚠️ Đang hiển thị suất chiếu mẫu (không kết nối được server)
        </div>
      )}

      {loadingShowtimes ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : allShowtimes.length === 0 ? (
        <EmptyShowtime />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-2xl p-5 ${card}`}>
              <h2 className="text-lg font-bold mb-4">Chọn ngày</h2>
              <div className="flex flex-wrap gap-3">
                {availableDates.map((date) => {
                  const active = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center px-4 py-3 rounded-xl border font-semibold transition ${
                        active
                          ? "bg-red-500 text-white border-red-500"
                          : darkMode
                          ? "bg-white/10 border-white/10 text-white hover:bg-white/20"
                          : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-xs opacity-80">{getDayLabel(date)}</span>
                      <span>{formatDate(date)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-2xl p-5 ${card}`}>
              <h2 className="text-lg font-bold mb-4">Lọc theo rạp</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedCinemaId(null)}
                  className={`px-4 py-2 rounded-xl border font-semibold transition ${
                    selectedCinemaId === null
                      ? "bg-red-500 text-white border-red-500"
                      : darkMode
                      ? "bg-white/10 border-white/10 hover:bg-white/20"
                      : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Tất cả
                </button>
                {cinemas.map((cinema) => (
                  <button
                    key={cinema.id}
                    onClick={() => setSelectedCinemaId(cinema.id)}
                    className={`px-4 py-2 rounded-xl border font-semibold transition ${
                      selectedCinemaId === cinema.id
                        ? "bg-red-500 text-white border-red-500"
                        : darkMode
                        ? "bg-white/10 border-white/10 hover:bg-white/20"
                        : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {cinema.name}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className={`rounded-2xl p-5 text-center ${card}`}>
                <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                  Không có suất chiếu nào trong ngày này.
                </p>
              </div>
            ) : (
              Object.entries(groupedByCinema).map(([cinemaName, showtimes]) => (
                <div key={cinemaName} className={`rounded-2xl p-5 ${card}`}>
                  <h2 className="text-lg font-bold mb-1">{cinemaName}</h2>
                  <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {formattedDate}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {showtimes.map((st) => {
                      const disabled = isPast(st.startTime);
                      return (
                        <button
                          key={st.showtimeId}
                          disabled={disabled}
                          onClick={() =>
                            navigate(
                              `/booking/${movie.movie_id}?date=${selectedDate}&cinema=${encodeURIComponent(cinemaName)}&time=${encodeURIComponent(formatTime(st.startTime))}&room=${encodeURIComponent(st.roomName)}&showtimeId=${st.showtimeId}`
                            )
                          }
                          className={`rounded-xl border px-4 py-3 font-semibold transition ${
                            disabled
                              ? "opacity-40 cursor-not-allowed bg-gray-200 text-gray-400 border-gray-200"
                              : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                          }`}
                        >
                          <div>{formatTime(st.startTime)}</div>
                          <div className="text-xs mt-1 opacity-80">{st.roomName}</div>
                          {disabled && <div className="text-xs mt-1">Đã qua</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <div className={`rounded-2xl p-5 ${card}`}>
              <h3 className="font-bold mb-3">Phim đang chọn</h3>
              <p className="text-sm mb-2"><span className="font-semibold">Tên phim:</span> {movie.title}</p>
              <p className="text-sm mb-2"><span className="font-semibold">Phân loại:</span> {movie.age_rating}</p>
              <p className="text-sm mb-2"><span className="font-semibold">Thời lượng:</span> {movie.duration_minutes} phút</p>
              <p className="text-sm"><span className="font-semibold">Thể loại:</span> {movie.genres?.join(", ")}</p>
            </div>
            <div className={`rounded-2xl p-5 ${card}`}>
              <h3 className="font-bold mb-3">Đã chọn</h3>
              <p className="text-sm mb-2">Ngày: {selectedDate ?? "—"}</p>
              <p className="text-sm mb-2">
                Rạp: {selectedCinemaId
                  ? cinemas.find((c) => c.id === selectedCinemaId)?.name
                  : "Tất cả"}
              </p>
              <p className="text-sm">Chọn giờ để tiếp tục sang màn giữ ghế.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
