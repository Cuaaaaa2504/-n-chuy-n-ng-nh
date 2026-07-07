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

const MAX_SEATS    = 8;
const HOLD_SECONDS = 300; // 5 phút

// Fallback mock chỉ dùng khi API chưa có dữ liệu hoặc lỗi
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

// Shape của một item trong response GET /showtime-seats/:showtimeId
interface SeatMapItem {
  showtimeSeatId: number;
  seatRow:        string;
  seatNumber:     number;
  seatLabel:      string | null;
  seatStatus:     string;
  price:          number;
}

// Shape của response GET /showtime-seats/:showtimeId
interface SeatMapResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName:   string | null;
  startTime:  string | null;
  seats:      SeatMapItem[];
}

// Shape của một item trong response POST /showtime-seats/hold-many
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

  // Tìm movie theo movie_id từ route param :id
  // Nếu không tìm thấy trong mockMovies, vẫn render trang với thông tin từ query params
  const movie = mockMovies.find((m) => String(m.movie_id) === id) ?? null;

  const [seats, setSeats]         = useState<SeatDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [usingMock, setUsingMock] = useState(false);

  // ── Hold state ───────────────────────────────────────────────────────────────────
  const [holding, setHolding]         = useState(false);
  const [holdMessage, setHoldMessage] = useState("");
  const [holdError, setHoldError]     = useState("");
  const [heldLabels, setHeldLabels]   = useState<string[]>([]);
  const [heldIds, setHeldIds]         = useState<number[]>([]);
  const [countdown, setCountdown]     = useState(0);

  // ── Navigating state ──────────────────────────────────────────────────────────────
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

  // ── Load seats từ API thật: GET /showtime-seats/:showtimeId ──────────────────────
  useEffect(() => {
    const showtimeId = searchParams.get("showtimeId") ?? id;
    if (!showtimeId) {
      // Không có showtimeId nào cả → dùng mock luôn
      setSeats(generateMockSeats());
      setUsingMock(true);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
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
        const res = await axiosClient.get(`/showtime-seats/${showtimeId}`) as unknown;
        if (cancelled) return;

        const data = res as SeatMapResponse;
        const rawSeats: SeatMapItem[] = Array.isArray(data)
          ? (data as unknown as SeatMapItem[])
          : (data?.seats ?? []);

        if (rawSeats.length === 0) {
          // API trả về mảng rỗng → dùng mock
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
        } else {
          const mapped: SeatDto[] = rawSeats.map((s) => ({
            id:         s.showtimeSeatId,
            rowName:    s.seatRow ?? "",
            seatNumber: Number(s.seatNumber ?? 0),
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
        if (cancelled) return;
        // Bất kỳ lỗi nào (401, 404, network...) → fallback mock thay vì trang trắng
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          // Token hết hạn → hiện mock nhưng thông báo cần đăng nhập khi giữ ghế
          setLoadError("Phiên đăng nhập hết hạn. Bạn đang xem ở chế độ khách. Vui lòng đăng nhập để đặt vé.");
        } else {
          setLoadError(`Không thể tải dữ liệu ghế từ máy chủ (${status ?? "lỗi mạng"}). Đang hiển thị dữ liệu mẫu.`);
        }
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
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

  // ── handleHold: POST /showtime-seats/hold-many ────────────────────────────────
  const handleHold = async () => {
    if (selectedSeats.length === 0) return;

    if (usingMock) {
      setHoldError("Không thể giữ ghế với dữ liệu mẫu. Vui lòng kiểm tra kết nối đến backend hoặc đăng nhập lại.");
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

  // ── handleContinueToPayment: POST /bookings { holdIds } ─────────────────────────
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
        res.id;

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
  const totalAmount = selectedSeats.reduce((sum, s) => sum + ((s as SeatDto & { price?: number }).price ?? 90_000), 0);
  const trailerEmbedUrl = movie ? getYoutubeEmbedUrl(movie.trailer_url) : null;

  // Lấy thông tin hiển thị: ưu tiên từ movie object, fallback về query params
  const date     = searchParams.get("date")   ?? "";
  const cinema   = searchParams.get("cinema") ?? "";
  const time     = searchParams.get("time")   ?? "";
  const room     = searchParams.get("room")   ?? "";

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
        {/* Thông báo lỗi load / dùng mock */}
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
            {/* Seat Map */}
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

            {/* Trailer — chỉ hiện nếu có movie */}
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

            {/* Hold message + countdown */}
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

            {/* Nút giữ ghế — chỉ hiện khi chưa giữ */}
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

            {/* Nút tiếp tục — chỉ hiện sau khi giữ ghế thành công */}
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
