// src/pages/SeatBookingPage.tsx

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useSeatSelection } from "../hooks/useSeatSelection";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";
import type { Seat } from "../hooks/useSeatHold";
import axiosClient from "../api/axiosClient";

const FALLBACK_POSTER   = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

const MAX_SEATS    = 8;
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
      seats.push({ id: id++, rowName: row, seatNumber: num, status, price: 90_000 });
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

interface SeatMapItem {
  showtimeSeatId: number;
  seatRow:        string;
  seatNumber:     number;
  seatLabel:      string | null;
  seatStatus:     string;
  price:          number;
}

interface SeatMapResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName:   string | null;
  startTime:  string | null;
  seats:      SeatMapItem[];
}

interface HoldResponseItem {
  holdId:         number;
  holdToken:      string;
  expiresAt:      string;
  status:         string;
  showtimeSeatId: number;
  seatLabel:      string | null;
  price:          number;
}

export default function SeatBookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate     = useNavigate();
  const { darkMode } = useTheme();

  const movie = mockMovies.find((m) => String(m.movie_id) === id) ?? null;

  const [seats, setSeats]         = useState<SeatDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [usingMock, setUsingMock] = useState(false);

  const [holding, setHolding]         = useState(false);
  const [holdMessage, setHoldMessage] = useState("");
  const [holdError, setHoldError]     = useState("");
  const [heldLabels, setHeldLabels]   = useState<string[]>([]);
  const [heldIds, setHeldIds]         = useState<number[]>([]);
  const [countdown, setCountdown]     = useState(0);

  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError]     = useState("");

  const {
    selectedSeats: selectedSeatIds,
    toggleSeat,
    clearSelection,
    getSelectedSeats,
  } = useSeatSelection({ maxSelectable: MAX_SEATS });

  const clearSelectionRef = useRef(clearSelection);
  useLayoutEffect(() => { clearSelectionRef.current = clearSelection; });

  useEffect(() => {
    const showtimeId = searchParams.get("showtimeId") ?? id;

    const load = async () => {
      if (!showtimeId) {
        setSeats(generateMockSeats());
        setUsingMock(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");
      setUsingMock(false);
      clearSelectionRef.current();
      setHeldLabels([]);
      setHeldIds([]);
      setHoldMessage("");
      setHoldError("");
      setNavError("");
      setCountdown(0);

      try {
        // axiosClient interceptor đã unwrap response.data rồi
        // nên res đã là SeatMapResponse trực tiếp
        const data = await axiosClient.get<SeatMapResponse>(`/showtime-seats/${showtimeId}`) as unknown as SeatMapResponse;

        // Hỗ trợ cả 2 shape: API trả thẳng mảng hoặc object { seats: [...] }
        const rawSeats: SeatMapItem[] = Array.isArray(data)
          ? (data as unknown as SeatMapItem[])
          : (data?.seats ?? []);

        if (rawSeats.length === 0) {
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
        } else {
          const mapped: SeatDto[] = rawSeats.map((s) => ({
            id:         s.showtimeSeatId,
            rowName:    s.seatRow ?? "",
            seatNumber: Number(s.seatNumber ?? 0),
            price:      Number(s.price ?? 90_000),
            status: ((): SeatDto["status"] => {
              switch (s.seatStatus) {
                case "AVAILABLE": return "AVAILABLE";
                case "HELD":      return "HELD";
                case "SOLD":      return "SOLD";
                case "BLOCKED":   return "BLOCKED";
                default:          return "AVAILABLE";
              }
            })(),
          }));
          setSeats(mapped);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          setLoadError("Phiên đă̆ng nhập hết hạn. Bạn đang xem ở chế độ khách.");
        } else {
          setLoadError(`Không thể tải dữ liệu ghế từ máy chủ (${status ?? "lỗi mạng"}). Đang hiển thị dữ liệu mẫu.`);
        }
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, searchParams]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHeldLabels([]);
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

  const handleHold = async () => {
    if (selectedSeats.length === 0) return;
    if (usingMock) {
      setHoldError("Không thể giữ ghế với dữ liệu mẫu.");
      return;
    }
    setHolding(true);
    setHoldMessage("");
    setHoldError("");
    try {
      const res = await axiosClient.post('/showtime-seats/hold-many', {
        showtimeSeatIds: selectedSeats.map((s) => s.id),
        holdMinutes: 5,
      }) as unknown;

      const holds: HoldResponseItem[] = Array.isArray(res)
        ? (res as HoldResponseItem[])
        : ((res as Record<string, unknown>)?.data as HoldResponseItem[]) ?? [];

      if (!holds.length) throw new Error('API trả về kết quả rỗng');

      const ids    = holds.map((h) => h.holdId);
      const labels = holds.map((h) =>
        h.seatLabel ??
        `${selectedSeats.find((s) => s.id === h.showtimeSeatId)?.rowName ?? ""}` +
        `${selectedSeats.find((s) => s.id === h.showtimeSeatId)?.seatNumber ?? ""}`
      );

      setHeldIds(ids);
      setHeldLabels(labels);
      setHoldMessage(`Đã giữ ${holds.length} ghế! Vui lòng thanh toán trong 5 phút.`);
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

  const handleContinueToPayment = async () => {
    if (heldIds.length === 0) {
      setNavError("Vui lòng bấm 'Giữ ghế' trước khi tiếp tục.");
      return;
    }
    setNavigating(true);
    setNavError("");
    try {
      const res = await axiosClient.post('/bookings', { holdIds: heldIds }) as Record<string, unknown>;
      const bookingId = res.bookingId ?? (res.data as Record<string, unknown> | undefined)?.bookingId ?? res.id;
      navigate(`/payment/${String(bookingId)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ?? "";
      setNavError(`Lỗi đặt vé: ${msg}`);
      setNavigating(false);
    }
  };

  // SeatDto[] đã được filter theo selectedSeatIds
  const selectedSeats = getSelectedSeats(seats);

  // Map sang shape Seat mà SelectedSeatsBar mộng đợi
  // Seat = { seatId: number; seatCode: string; price: number }
  const selectedSeatsForBar: Seat[] = selectedSeats.map((s) => ({
    seatId:   s.id,
    seatCode: `${s.rowName}${s.seatNumber}`,
    price:    (s as SeatDto & { price?: number }).price ?? 90_000,
  }));

  const totalAmount     = selectedSeatsForBar.reduce((sum, s) => sum + s.price, 0);
  const trailerEmbedUrl = movie ? getYoutubeEmbedUrl(movie.trailer_url) : null;

  const date   = searchParams.get("date")   ?? "";
  const cinema = searchParams.get("cinema") ?? "";
  const time   = searchParams.get("time")   ?? "";
  const room   = searchParams.get("room")   ?? "";

  const displayTitle    = movie?.title ?? `Phim #${id ?? "?"}`;
  const displayPoster   = movie?.poster_url ?? FALLBACK_POSTER;
  const displayBackdrop = movie?.backdrop_url ?? FALLBACK_BACKDROP;
  const displayRating   = movie?.age_rating ?? "";
  const displayDuration = movie?.duration_minutes ? `${movie.duration_minutes} phút` : "";

  const card = darkMode ? "bg-gray-900 border border-gray-800" : "bg-white shadow";

  return (
    <div className="flex-1">
      {/* Backdrop banner */}
      <div className="relative h-[260px] md:h-[340px] overflow-hidden">
        <img
          src={displayBackdrop}
          alt={displayTitle}
          onError={(e) => { e.currentTarget.src = FALLBACK_BACKDROP; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute top-5 left-5 z-20">
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
              src={displayPoster}
              alt={displayTitle}
              onError={(e) => { e.currentTarget.src = FALLBACK_POSTER; }}
              className="w-24 md:w-32 aspect-[2/3] object-cover rounded-xl shadow-lg border border-white/10"
            />
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {displayRating && (
                  <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {displayRating}
                  </span>
                )}
                {displayDuration && (
                  <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/10">
                    {displayDuration}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white">{displayTitle}</h1>
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
        {loadError && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium border ${
            darkMode
              ? "bg-yellow-900/20 border-yellow-700/30 text-yellow-400"
              : "bg-yellow-50 border-yellow-200 text-yellow-700"
          }`}>
            ⚠️ {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-2xl p-5 ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Chọn ghế</h2>
                {usingMock && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    darkMode
                      ? "bg-yellow-900/30 border-yellow-700/40 text-yellow-400"
                      : "bg-yellow-50 border-yellow-200 text-yellow-600"
                  }`}>
                    Dữ liệu mẫu
                  </span>
                )}
              </div>
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

            {trailerEmbedUrl && (
              <div className={`rounded-2xl p-5 ${card}`}>
                <h2 className="text-lg font-bold mb-3">Trailer</h2>
                <div className="aspect-video overflow-hidden rounded-xl">
                  <iframe
                    src={trailerEmbedUrl}
                    title={`${displayTitle} trailer`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {heldIds.length > 0 && countdown > 0 && (
              <div className={`rounded-2xl p-4 border ${
                darkMode ? "bg-yellow-900/20 border-yellow-700/30" : "bg-yellow-50 border-yellow-200"
              }`}>
                <p className="text-yellow-500 font-semibold text-sm mb-1">⏳ {holdMessage}</p>
                <p className="font-mono text-yellow-400 text-lg font-bold">
                  {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                </p>
                {heldLabels.length > 0 && (
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Ghế: {heldLabels.join(", ")}
                  </p>
                )}
              </div>
            )}

            {holdError && (
              <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-semibold">{holdError}</p>
              </div>
            )}

            {navError && (
              <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-semibold">{navError}</p>
              </div>
            )}

            {heldIds.length === 0 && (
              <button
                onClick={handleHold}
                disabled={holding || selectedSeats.length === 0}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                {holding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang giữ ghế...
                  </>
                ) : (
                  "⏳ Giữ ghế (5 phút)"
                )}
              </button>
            )}

            {heldIds.length > 0 && (
              <button
                onClick={handleContinueToPayment}
                disabled={navigating}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                {navigating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Tiếp tục thanh toán →"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SelectedSeatsBar nhận đúng shape Seat = { seatId, seatCode, price } */}
      <SelectedSeatsBar
        selectedSeats={selectedSeatsForBar}
        totalPrice={totalAmount}
        countdown={countdown}
        loading={holding}
        message={holdMessage}
        error={holdError}
        heldSeatCodes={heldLabels}
        onHold={heldIds.length > 0 ? handleContinueToPayment : handleHold}
      />
    </div>
  );
}
