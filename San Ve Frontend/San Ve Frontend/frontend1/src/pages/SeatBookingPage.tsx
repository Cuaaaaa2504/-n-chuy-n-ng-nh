// src/pages/SeatBookingPage.tsx

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useSeatSelection } from "../hooks/useSeatSelection";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";
import axiosClient from "../api/axiosClient";

const FALLBACK_POSTER   = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

const SEAT_PRICE  = 90_000;
const MAX_SEATS   = 8;
const HOLD_SECONDS = 300; // 5 phút

function generateMockSeats(showtimeId?: string): SeatDto[] {
  void showtimeId;
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
  const navigate    = useNavigate();
  const { darkMode } = useTheme();

  const movie = mockMovies.find((m) => String(m.movie_id) === id);
  const [seats, setSeats]     = useState<SeatDto[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Hold state ─────────────────────────────────────────────────────────────────────
  const [holding, setHolding]         = useState(false);
  const [holdMessage, setHoldMessage] = useState("");
  const [holdError, setHoldError]     = useState("");
  const [heldCodes, setHeldCodes]     = useState<string[]>([]);
  const [heldIds, setHeldIds]         = useState<number[]>([]); // holdIds thật từ API hold
  const [countdown, setCountdown]     = useState(0);

  // ── Navigating state ──────────────────────────────────────────────────────────────
  const [navigating, setNavigating]   = useState(false);
  const [navError, setNavError]       = useState("");

  const {
    selectedSeats: selectedSeatIds,
    toggleSeat,
    clearSelection,
    getSelectedSeats,
  } = useSeatSelection({ maxSelectable: MAX_SEATS });

  const clearSelectionRef = useRef(clearSelection);
  useLayoutEffect(() => {
    clearSelectionRef.current = clearSelection;
  });

  // ── Load seats từ API thật ────────────────────────────────────────────────────────
  useEffect(() => {
    const showtimeId = searchParams.get("showtimeId") ?? id;
    if (!showtimeId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      clearSelectionRef.current();
      setHeldCodes([]);
      setHeldIds([]);
      setHoldMessage("");
      setHoldError("");
      setNavError("");
      setCountdown(0);

      try {
        // Gọi API lấy ghế thật của suất chiếu
        const res = await axiosClient.get(`/showtime-seats?showtimeId=${showtimeId}`) as unknown;
        if (cancelled) return;

        const rawList: Record<string, unknown>[] = Array.isArray(res)
          ? (res as Record<string, unknown>[])
          : Array.isArray((res as Record<string, unknown>).data)
          ? ((res as Record<string, unknown>).data as Record<string, unknown>[])
          : [];

        const mapped: SeatDto[] = rawList.map((s) => {
          const seat = s.seat as Record<string, unknown> | undefined;
          return {
            id: Number(s.showtimeSeatId ?? s.id),
            rowName: String(seat?.seatRow ?? seat?.rowName ?? s.rowName ?? ""),
            seatNumber: Number(seat?.seatNumber ?? s.seatNumber ?? 0),
            status: (s.status ?? "AVAILABLE") as SeatDto["status"],
          };
        });

        setSeats(mapped);
      } catch {
        // Fallback sang mock nếu API chưa có dữ liệu
        if (!cancelled) setSeats(generateMockSeats(showtimeId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [id, searchParams]);

  // ── Countdown timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHeldCodes([]);
          setHeldIds([]);
          setHoldMessage("");
          clearSelectionRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ── handleHold — gọi API hold thật ───────────────────────────────────────────────
  const handleHold = async () => {
    if (selectedSeats.length === 0) return;
    setHolding(true);
    setHoldMessage("");
    setHoldError("");
    try {
      // Gọi API hold nhiều ghế cùng lúc
      const res = await axiosClient.post('/showtime-seats/hold-multiple', {
        showtimeSeatIds: selectedSeats.map((s) => s.id),
        holdMinutes: 5,
      }) as unknown;

      const holds: Array<{ holdId: number; expiresAt?: string }> = Array.isArray(res)
        ? (res as Array<{ holdId: number; expiresAt?: string }>)
        : Array.isArray((res as Record<string, unknown>).data)
        ? ((res as Record<string, unknown>).data as Array<{ holdId: number; expiresAt?: string }>)
        : [];

      const ids   = holds.map((h) => Number(h.holdId));
      const codes = selectedSeats.map((s) => `${s.rowName}${s.seatNumber}`);

      setHeldIds(ids);
      setHeldCodes(codes);
      setHoldMessage(`Đã giữ ${codes.length} ghế! Vui lòng thanh toán trong 5 phút.`);
      setCountdown(HOLD_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Lỗi không xác định";
      setHoldError(`Không thể giữ ghế: ${msg}`);
    } finally {
      setHolding(false);
    }
  };

  // ── Tiếp tục thanh toán — bắt buộc phải có heldIds từ API ───────────────────────
  const handleContinueToPayment = async () => {
    if (heldIds.length === 0) {
      setNavError("Vui lòng bấm 'Giữ ghế' trước khi tiếp tục.");
      return;
    }
    setNavigating(true);
    setNavError("");
    try {
      const res = await axiosClient.post('/bookings', {
        holdIds: heldIds,
      }) as Record<string, unknown>;

      const bookingId =
        res.bookingId ??
        (res.data as Record<string, unknown> | undefined)?.bookingId ??
        (res as Record<string, unknown>).id;

      navigate(`/payment/${String(bookingId)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "";
      setNavError(`Lỗi đặt vé: ${msg}`);
      setNavigating(false);
    }
  };

  const selectedSeats   = getSelectedSeats(seats);
  const totalPrice      = selectedSeats.length * SEAT_PRICE;
  const totalAmount     = totalPrice;
  const trailerEmbedUrl = movie ? getYoutubeEmbedUrl(movie.trailer_url) : null;

  const card = darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow";

  if (!movie) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Không tìm thấy phìm</h1>
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
                  Hiện chưa có trailer phù hợp cho phìm này.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
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
                        className="bg-blue-500/15 text-blue-400 text-xs font-mono font-bold px-3 py-1 rounded-full"
                      >
                        {s.rowName}{s.seatNumber}
                      </span>
                    ))}
                  </div>
                  <div className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Tổng: <span className="text-red-500">{totalAmount.toLocaleString("vi-VN")}₫</span>
                  </div>
                </>
              )}
            </div>

            {/* Hold message / countdown */}
            {heldCodes.length > 0 && countdown > 0 && (
              <div className={`rounded-2xl p-4 border ${
                darkMode ? "bg-yellow-900/20 border-yellow-700/30" : "bg-yellow-50 border-yellow-200"
              }`}>
                <p className="text-yellow-500 font-semibold text-sm mb-1">⏳ {holdMessage}</p>
                <p className="font-mono text-yellow-400 text-lg font-bold">
                  {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Ghế: {heldCodes.join(", ")}
                </p>
              </div>
            )}

            {/* Hold error */}
            {holdError && (
              <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-semibold">{holdError}</p>
              </div>
            )}

            {/* Nav error */}
            {navError && (
              <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-semibold">{navError}</p>
              </div>
            )}

            {/* Nút giữ ghế */}
            {heldIds.length === 0 && (
              <button
                onClick={handleHold}
                disabled={holding || selectedSeats.length === 0}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                {holding ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang giữ ghế...</>
                ) : (
                  "⏳ Giữ ghế (5 phút)"
                )}
              </button>
            )}

            {/* Nút tiếp tục thanh toán — chỉ hiện sau khi giữ ghế thành công */}
            {heldIds.length > 0 && (
              <button
                onClick={handleContinueToPayment}
                disabled={navigating}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                {navigating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
                ) : (
                  "Tiếp tục thanh toán →"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <SelectedSeatsBar
        seats={selectedSeats}
        totalAmount={totalAmount}
        onClear={clearSelection}
        onCheckout={heldIds.length > 0 ? handleContinueToPayment : handleHold}
        checkoutLabel={heldIds.length > 0 ? "Tiếp tục thanh toán" : "Giữ ghế"}
      />
    </div>
  );
}
