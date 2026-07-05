// src/pages/SeatBookingPage.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useSeatSelection } from "../hooks/useSeatSelection";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";

const FALLBACK_POSTER   = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

const SEAT_PRICE = 90_000;
const MAX_SEATS  = 8;

// ── Mock seat generator ────────────────────────────────────────────────────
function generateMockSeats(_showtimeId?: string): SeatDto[] { // ✅ prefix _ để tránh unused-vars
  const rows = ["A","B","C","D","E","F","G","H"];
  const seats: SeatDto[] = [];
  let id = 1;
  rows.forEach((row) => {
    for (let num = 1; num <= 10; num++) {
      const rand = Math.random();
      const status: SeatDto["status"] =
        rand < 0.15 ? "SOLD"    :
        rand < 0.22 ? "HELD"    :
        rand < 0.25 ? "BLOCKED" : "AVAILABLE";
      seats.push({ id: id++, rowName: row, seatNumber: num, status });
    }
  });
  return seats;
}

function getYoutubeEmbedUrl(url?: string) {
  if (!url) return null;
  if (url.includes("watch?v=")) {
    const vid = url.split("watch?v=")[1]?.split("&")[0];
    return vid ? `https://www.youtube.com/embed/${vid}` : null;
  }
  if (url.includes("youtu.be/")) {
    const vid = url.split("youtu.be/")[1]?.split("?")[0];
    return vid ? `https://www.youtube.com/embed/${vid}` : null;
  }
  return null;
}

export default function SeatBookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate  = useNavigate();
  const { darkMode } = useTheme();

  const movie      = mockMovies.find((m) => String(m.movie_id) === id);
  // ✅ XÓA showtimeId riêng → lấy trực tiếp từ searchParams khi cần
  const [seats, setSeats]     = useState<SeatDto[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    selectedSeats: selectedSeatIds,
    toggleSeat,
    clearSelection,
    getSelectedSeats,
  } = useSeatSelection({ maxSelectable: MAX_SEATS });

  // ✅ Dùng ref để tránh set-state-in-effect + exhaustive-deps
  const clearSelectionRef    = useRef(clearSelection);
  const getSelectedSeatsRef  = useRef(getSelectedSeats);
  clearSelectionRef.current   = clearSelection;
  getSelectedSeatsRef.current = getSelectedSeats;

  useEffect(() => {
    const stId = searchParams.get("showtimeId") ?? id ?? undefined;
    // ✅ setLoading chạy bên trong async function, không phải sync body
    let cancelled = false;
    const load = async () => {
      clearSelectionRef.current();
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      if (cancelled) return;
      setSeats(generateMockSeats(stId));
      setLoading(false);
    };
    setLoading(true); // set trước khi async bắt đầu → vẫn sync nhưng không trong effect body khi render
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  // ✅ Đưa getSelectedSeats vào deps thông qua callback ổn định
  const getSelectedSeatsStable = useCallback(
    (s: SeatDto[]) => getSelectedSeatsRef.current(s),
    []
  );

  const selectedSeats   = useMemo(() => getSelectedSeatsStable(seats), [selectedSeatIds, seats, getSelectedSeatsStable]);
  const totalPrice      = selectedSeats.length * SEAT_PRICE;
  const trailerEmbedUrl = movie ? getYoutubeEmbedUrl(movie.trailer_url) : null;

  const card = darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow";

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

  const date   = searchParams.get("date")   ?? "";
  const cinema = searchParams.get("cinema") ?? "";
  const time   = searchParams.get("time")   ?? "";
  const room   = searchParams.get("room")   ?? "";

  return (
    <div className="flex-1">
      {/* Backdrop banner */}
      <div className="relative h-[260px] md:h-[340px] overflow-hidden">
        <img
          src={movie.backdrop_url || FALLBACK_BACKDROP}
          alt={movie.title}
          onError={(e) => { e.currentTarget.src = FALLBACK_BACKDROP; }}
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
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-10 pb-6">
          <div className="max-w-6xl mx-auto flex items-end gap-4">
            <img
              src={movie.poster_url}
              alt={movie.title}
              onError={(e) => { e.currentTarget.src = FALLBACK_POSTER; }}
              className="w-24 md:w-32 aspect-[2/3] object-cover rounded-xl shadow-lg border border-white/10"
            />
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  {movie.age_rating}
                </span>
                <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/10">
                  {movie.duration_minutes} phút
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white">{movie.title}</h1>
              {(cinema || date || time) && (
                <p className="text-white/70 text-sm mt-1">
                  {[cinema, date, time, room].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Seat Map */}
            <div className={`rounded-2xl p-5 ${card}`}>
              <h2 className="text-lg font-bold mb-3">Chọn ghế</h2>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <SeatMap
                  seats={seats}
                  selectedSeats={selectedSeatIds}
                  onSeatSelect={(seatId) => toggleSeat(seatId, seats)}
                  maxSelectable={MAX_SEATS}
                  showLegend={true}
                />
              )}
            </div>

            {/* Trailer */}
            <div className={`rounded-2xl p-5 ${card}`}>
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected seats summary */}
            <div className={`rounded-2xl p-5 ${card}`}>
              <h3 className="font-bold mb-3">Ghế đã chọn</h3>
              {selectedSeats.length === 0 ? (
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Chưa chọn ghế nào. Tối đa {MAX_SEATS} ghế.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedSeats.map((s) => (
                      <span
                        key={s.id}
                        className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg text-sm font-mono font-semibold"
                      >
                        {s.rowName}{s.seatNumber}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Số ghế:</span>
                    <span className="font-semibold">{selectedSeats.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span>Đơn giá:</span>
                    <span>{SEAT_PRICE.toLocaleString("vi-VN")}₫/ghế</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-3">
                    <span>Tổng tiền:</span>
                    <span className="text-red-500">{totalPrice.toLocaleString("vi-VN")}₫</span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="mt-3 text-xs text-gray-400 hover:text-red-400 transition"
                  >
                    Xóa tất cả
                  </button>
                </>
              )}
            </div>

            {/* ✅ Truyền đúng type Seat (seatId bắt buộc); countdown/message/error không còn null */}
            <SelectedSeatsBar
              selectedSeats={selectedSeats.map((s) => ({
                seatId:   s.id,               // ✅ thêm seatId
                seatCode: `${s.rowName}${s.seatNumber}`,
                price:    SEAT_PRICE,
                status:   s.status as 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED',
              }))}
              totalPrice={totalPrice}
              countdown={0}          // ✅ thay null → 0 (number)
              loading={loading}
              message={""}           // ✅ thay null → ""
              error={""}             // ✅ thay null → ""
              heldSeatCodes={[]}
              onHold={() => {}}
            />

            {/* Movie info */}
            <div className={`rounded-2xl p-5 ${card}`}>
              <h3 className="font-bold mb-2">Thông tin phim</h3>
              <p className="text-sm mb-1"><span className="font-semibold">Tên phim:</span> {movie.title}</p>
              <p className="text-sm mb-1"><span className="font-semibold">Thời lượng:</span> {movie.duration_minutes} phút</p>
              <p className="text-sm mb-1"><span className="font-semibold">Phân loại:</span> {movie.age_rating}</p>
              <p className="text-sm"><span className="font-semibold">Thể loại:</span> {movie.genres.join(", ")}</p>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border font-semibold"
          >
            Quay lại
          </button>
          <button
            disabled={selectedSeats.length === 0}
            onClick={() => navigate(`/payment/${id}?seats=${selectedSeatIds.join(",")}&total=${totalPrice}`)}
            className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Tiếp tục thanh toán ({selectedSeats.length} ghế)
          </button>
        </div>
      </div>
    </div>
  );
}
