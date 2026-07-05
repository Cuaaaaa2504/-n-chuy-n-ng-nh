import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";

type Cinema = {
  id: number;
  name: string;
  address: string;
};

type Showtime = {
  time: string;
  room: string;
};

const cinemas: Cinema[] = [
  { id: 1, name: "CMC Cinema Hà Nội", address: "123 Nguyễn Trãi, Hà Nội" },
  { id: 2, name: "CMC Cinema Đà Nẵng", address: "45 Trần Phú, Đà Nẵng" },
  { id: 3, name: "CMC Cinema HCM", address: "99 Lý Tự Trọng, TP.HCM" },
];

const dates = [
  "2026-06-24",
  "2026-06-25",
  "2026-06-26",
  "2026-06-27",
  "2026-06-28",
];

const mockShowtimes: Record<number, Showtime[]> = {
  1: [
    { time: "09:00", room: "Phòng 1" },
    { time: "12:30", room: "Phòng 2" },
    { time: "16:00", room: "Phòng 3" },
    { time: "20:15", room: "Phòng 4" },
  ],
  2: [
    { time: "10:00", room: "Phòng 1" },
    { time: "13:45", room: "Phòng 2" },
    { time: "18:00", room: "Phòng 3" },
    { time: "21:00", room: "Phòng 4" },
  ],
  3: [
    { time: "08:30", room: "Phòng 1" },
    { time: "11:15", room: "Phòng 2" },
    { time: "15:30", room: "Phòng 3" },
    { time: "19:45", room: "Phòng 4" },
  ],
};

export default function ShowtimeSelectPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const movie = mockMovies.find((m) => String(m.movie_id) === movieId);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number>(1);

  const selectedCinema = cinemas.find((c) => c.id === selectedCinemaId);
  const showtimes = mockShowtimes[selectedCinemaId] || [];

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }, [selectedDate]);

  if (!movie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Không tìm thấy phim</h1>
          <button
            onClick={() => navigate(-1)}
            className="inline-block bg-red-500 text-white px-5 py-2 rounded-lg"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const handleSelectShowtime = (time: string, room: string) => {
    navigate(
      `/booking/${movie.movie_id}?date=${selectedDate}&cinema=${encodeURIComponent(
        selectedCinema?.name || ""
      )}&time=${time}&room=${encodeURIComponent(room)}`
    );
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-10 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Chọn suất chiếu</h1>
          <p className={darkMode ? "text-gray-400 mt-1" : "text-gray-600 mt-1"}>
            {movie.title}
          </p>
        </div>

        <button
          onClick={() => navigate(`/movies/${movie.movie_id}`)}
          className="px-4 py-2 rounded-xl border font-semibold"
        >
          Quay lại phim
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Chọn ngày */}
          <div
            className={`rounded-2xl p-5 ${
              darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"
            }`}
          >
            <h2 className="text-lg font-bold mb-4">Chọn ngày</h2>
            <div className="flex flex-wrap gap-3">
              {dates.map((date) => {
                const active = selectedDate === date;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-4 py-3 rounded-xl border font-semibold transition ${
                      active
                        ? "bg-red-500 text-white border-red-500"
                        : darkMode
                        ? "bg-white/10 border-white/10 text-white hover:bg-white/20"
                        : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {new Intl.DateTimeFormat("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(date))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn rạp */}
          <div
            className={`rounded-2xl p-5 ${
              darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"
            }`}
          >
            <h2 className="text-lg font-bold mb-4">Chọn rạp</h2>
            <div className="space-y-3">
              {cinemas.map((cinema) => {
                const active = selectedCinemaId === cinema.id;
                return (
                  <button
                    key={cinema.id}
                    onClick={() => setSelectedCinemaId(cinema.id)}
                    className={`w-full text-left p-4 rounded-xl border transition ${
                      active
                        ? "bg-red-500 text-white border-red-500"
                        : darkMode
                        ? "bg-white/10 border-white/10 hover:bg-white/20"
                        : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    <p className="font-bold">{cinema.name}</p>
                    <p className={`text-sm mt-1 ${active ? "text-white/90" : "opacity-70"}`}>
                      {cinema.address}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Giờ chiếu */}
          <div
            className={`rounded-2xl p-5 ${
              darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"
            }`}
          >
            <h2 className="text-lg font-bold mb-2">Giờ chiếu</h2>
            <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {formattedDate} • {selectedCinema?.name}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {showtimes.map((showtime) => (
                <button
                  key={showtime.time}
                  onClick={() => handleSelectShowtime(showtime.time, showtime.room)}
                  className="rounded-xl border px-4 py-3 font-semibold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition"
                >
                  <div>{showtime.time}</div>
                  <div className="text-xs mt-1 opacity-80">{showtime.room}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar thông tin */}
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-5 ${
              darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"
            }`}
          >
            <h3 className="font-bold mb-3">Phim đang chọn</h3>
            <p className="text-sm mb-2">
              <span className="font-semibold">Tên phim:</span> {movie.title}
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">Phân loại:</span> {movie.age_rating}
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">Thời lượng:</span> {movie.duration_minutes} phút
            </p>
            <p className="text-sm">
              <span className="font-semibold">Thể loại:</span> {movie.genres.join(", ")}
            </p>
          </div>

          <div
            className={`rounded-2xl p-5 ${
              darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"
            }`}
          >
            <h3 className="font-bold mb-3">Đã chọn</h3>
            <p className="text-sm mb-2">Ngày: {selectedDate}</p>
            <p className="text-sm mb-2">Rạp: {selectedCinema?.name}</p>
            <p className="text-sm">Chọn giờ để tiếp tục sang màn giữ ghế.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
