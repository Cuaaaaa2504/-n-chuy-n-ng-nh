import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SeatMap from "../components/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useSeatHold } from "../hooks/useSeatHold";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";

const FALLBACK_POSTER = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

function getYoutubeEmbedUrl(url?: string) {
  if (!url) return null;
  if (url.includes("watch?v=")) {
    const id = url.split("watch?v=")[1]?.split("&")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  return null;
}

export default function SeatBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const movie = mockMovies.find((m) => String(m.movie_id) === id);
  const {
    seats,
    selectedSeatIds,
    selectedSeats,
    totalPrice,
    countdown,
    loading,
    message,
    error,
    toggleSeat,
    holdSeats,
  } = useSeatHold(id);

  const heldSeatCodes = useMemo(
    () => selectedSeats.map((s) => s.seatCode),
    [selectedSeats]
  );

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

  const trailerEmbedUrl = getYoutubeEmbedUrl(movie.trailer_url);

  return (
    <div className="flex-1">
      <div className="relative h-[260px] md:h-[340px] overflow-hidden">
        <img
          src={movie.backdrop_url || FALLBACK_BACKDROP}
          alt={movie.title}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_BACKDROP; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute top-5 left-5 z-20 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
          >
            ← Quay lại
          </button>
          <button
            onClick={() => navigate(`/movies/${movie.movie_id}`)}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20"
          >
            Trang phim
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-10 pb-6 md:pb-8">
          <div className="max-w-6xl mx-auto flex items-end gap-4 md:gap-6">
            <img
              src={movie.poster_url}
              alt={movie.title}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_POSTER; }}
              className="w-24 md:w-32 aspect-[2/3] object-cover rounded-xl shadow-lg border border-white/10"
            />
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-red-500 text-white text-xs md:text-sm px-3 py-1 rounded-full font-semibold">
                  {movie.age_rating}
                </span>
                <span className="bg-white/10 text-white text-xs md:text-sm px-3 py-1 rounded-full border border-white/10">
                  {movie.duration_minutes} phút
                </span>
                <span className="bg-white/10 text-white text-xs md:text-sm px-3 py-1 rounded-full border border-white/10">
                  {movie.status === "NOW_SHOWING" ? "Đang chiếu" : "Sắp chiếu"}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white">{movie.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`rounded-2xl p-5 mb-6 ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"}`}>
              <h2 className="text-lg font-bold mb-3">Chọn ghế</h2>
              <SeatMap seats={seats} selectedSeatIds={selectedSeatIds} onToggleSeat={toggleSeat} />
            </div>

            <div className={`rounded-2xl p-5 ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"}`}>
              <h2 className="text-lg font-bold mb-3">Trailer</h2>
              {trailerEmbedUrl ? (
                <div className="aspect-video overflow-hidden rounded-xl">
                  <iframe
                    src={trailerEmbedUrl}
                    title={`${movie.title} trailer`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                  Hiện chưa có trailer phù hợp cho phim này.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <SelectedSeatsBar
              selectedSeats={selectedSeats}
              totalPrice={totalPrice}
              countdown={countdown}
              loading={loading}
              message={message}
              error={error}
              heldSeatCodes={heldSeatCodes}
              onHold={holdSeats}
            />

            <div className={`rounded-2xl p-5 ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow"}`}>
              <h3 className="font-bold mb-2">Thông tin phim</h3>
              <p className="text-sm mb-1"><span className="font-semibold">Tên phim:</span> {movie.title}</p>
              <p className="text-sm mb-1"><span className="font-semibold">Thời lượng:</span> {movie.duration_minutes} phút</p>
              <p className="text-sm mb-1"><span className="font-semibold">Phân loại:</span> {movie.age_rating}</p>
              <p className="text-sm"><span className="font-semibold">Thể loại:</span> {movie.genres.join(", ")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border font-semibold"
          >
            Quay lại
          </button>
          <button
            onClick={() => navigate(`/payment/${id}`)}
            className="px-5 py-3 rounded-xl bg-red-500 text-white font-semibold"
          >
            Tiếp tục thanh toán
          </button>
        </div>
      </div>
    </div>
  );
}
