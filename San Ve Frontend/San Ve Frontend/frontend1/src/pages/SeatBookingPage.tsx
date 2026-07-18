// src/pages/SeatBookingPage.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useTheme } from "../context/useTheme";
import type { SeatDto } from "../types/seat.types";
import type { Seat } from "../hooks/useSeatHold";
import axiosClient from "../api/axiosClient";
import { normalizeSeat } from "../api/seat.service";

const FALLBACK_POSTER   = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

const MAX_SEATS    = 8;
const HOLD_SECONDS = 300;

function generateMockSeats(showtimeId?: string): SeatDto[] {
  void showtimeId;
  const rows  = ['A','B','C','D','E','F','G','H'];
  const cols  = 10;
  const seats: SeatDto[] = [];
  for (const row of rows) {
    for (let col = 1; col <= cols; col++) {
      const t = (row >= 'E') ? 'VIP' : 'STANDARD';
      seats.push({
        id:         `${row}${col}`,
        rowName:    row,
        seatNumber: col,
        type:       t,
        status:     'AVAILABLE',
        price:      t === 'VIP' ? 120_000 : 90_000,
      });
    }
  }
  return seats;
}

function getYoutubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0` : null;
}

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

interface SeatMapResponse {
  showtimeId?: number;
  movieTitle?: string | null;
  cinemaName?: string | null;
  roomName?:   string | null;
  showDate?:   string | null;
  showTime?:   string | null;
  // ⚠️ Backend trả field snake/khác tên (showtimeSeatId, seatRow, seatStatus,
  // seatTypeCode...) nên KHÔNG được coi thẳng là SeatDto — phải normalize.
  seats?: Record<string, unknown>[];
}

interface ShowtimeInfo {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName:   string | null;
  showDate:   string | null;
  showTime:   string | null;
}

interface MovieInfo {
  movie_id: number;
  title: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  age_rating?: string;
  duration_minutes?: number;
  genres?: string[];
  description?: string;
}

/**
 * ⚠️ NGUYÊN NHÂN GỐC CỦA BUG "Không thể giữ ghế":
 * POST /showtime-seats/hold-many trả về MỘT MẢNG HoldResponseDto[], KHÔNG phải
 * object { holdIds }. Code cũ đọc `res.holdIds` -> luôn undefined -> heldIds = []
 * -> nút "Đặt vé" tưởng chưa hold và gọi hold lần 2 -> ghế đã ở trạng thái HELD
 * -> backend ném "Các ghế không còn trống" -> hiện lỗi.
 */
interface HoldItem {
  holdId: string;          // BIGINT -> backend trả string
  holdToken: string;
  expiresAt: string;
  status: string;
  showtimeSeatId: number;
  seatLabel: string;
  price: number;
}

export default function SeatBookingPage() {
  const params  = useParams<{ id?: string; movieId?: string }>();
  const movieId = params.id ?? params.movieId;

  const [searchParams]  = useSearchParams();
  const { darkMode }    = useTheme();
  const navigate        = useNavigate();

  const [movie, setMovie]                     = useState<MovieInfo | null>(null);
  const [seats, setSeats]                     = useState<SeatDto[]>([]);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [showtimeInfo, setShowtimeInfo]       = useState<ShowtimeInfo | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [holdError, setHoldError]             = useState<string | null>(null);
  const [heldIds, setHeldIds]                 = useState<number[]>([]);
  const [holdCountdown, setHoldCountdown]     = useState<number>(HOLD_SECONDS);
  const [holdExpired, setHoldExpired]         = useState(false);
  const [holding, setHolding]                 = useState(false);
  const [navigating, setNavigating]           = useState(false);
  const [navError, setNavError]               = useState<string>('');
  const [usingMock, setUsingMock]             = useState(false);
  const [holdExpiresAt, setHoldExpiresAt]     = useState<string | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const movieSetRef = useRef(false);
  // FIX: ref phản chiếu heldIds — đọc được giá trị MỚI NHẤT ngay trong cùng tick,
  // không phải chờ React re-render. Chặn hoàn toàn việc hold lần 2 do state async.
  const heldIdsRef = useRef<number[]>([]);
  // Chặn double-submit khi user bấm "Đặt vé" liên tục / bấm cả 2 nút cùng lúc.
  const inFlightRef = useRef(false);

  // ─── Countdown ───────────────────────────────────────────────────────────
  // FIX: đếm theo mốc expiresAt THẬT từ backend thay vì cứng 300s.
  // Trước đây FE và DB lệch nhau -> countdown còn thời gian nhưng hold đã hết hạn.
  const startCountdown = (expiresAt?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const deadline = expiresAt
      ? new Date(expiresAt).getTime()
      : Date.now() + HOLD_SECONDS * 1000;

    setHoldExpiresAt(expiresAt ?? null);
    setHoldExpired(false);

    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setHoldCountdown(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        heldIdsRef.current = [];
        setHeldIds([]);
        setSelectedIds(new Set());
        setHoldExpired(true);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ─── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      movieSetRef.current = false;
      setSelectedIds(new Set());
      heldIdsRef.current = [];
      setHeldIds([]);
      setHoldExpiresAt(null);
      setHoldCountdown(HOLD_SECONDS);
      setHoldExpired(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 0);

    const load = async () => {
      setLoading(true);
      setError(null);
      const showtimeId = searchParams.get('showtimeId');
      const qDate      = searchParams.get('date')   ?? null;
      const qCinema    = searchParams.get('cinema') ?? null;
      const qTime      = searchParams.get('time')   ?? null;
      const qRoom      = searchParams.get('room')   ?? null;

      if (!showtimeId) {
        setSeats(generateMockSeats());
        setUsingMock(true);
        setLoading(false);
        return;
      }

      setShowtimeInfo({
        showtimeId: Number(showtimeId),
        movieTitle: null,
        cinemaName: qCinema ? decodeURIComponent(qCinema) : null,
        roomName:   qRoom   ? decodeURIComponent(qRoom)   : null,
        showDate:   qDate,
        showTime:   qTime,
      });

      try {
        const data = await axiosClient.get<SeatMapResponse>(
          `/showtime-seats/${showtimeId}`
        ) as unknown as SeatMapResponse;

        // ✅ FIX: chuẩn hoá field từ backend (showtimeSeatId→id, seatRow→rowName,
        // seatStatus→status, seatTypeCode→type) trước khi đưa vào state.
        const seatList   = (data.seats ?? []).map(normalizeSeat);
        const movieTitle = data.movieTitle ?? null;
        const cinemaName = data.cinemaName ?? qCinema ?? null;
        const roomName   = data.roomName   ?? qRoom   ?? null;
        const showDate   = data.showDate   ?? qDate   ?? null;
        const showTime   = data.showTime   ?? qTime   ?? null;

        setShowtimeInfo({ showtimeId: Number(showtimeId), movieTitle, cinemaName, roomName, showDate, showTime });

        if (seatList.length === 0) {
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
        } else {
          setSeats(seatList);
          setUsingMock(false);
        }

        if (movieId && !movieSetRef.current) {
          try {
            const m = await axiosClient.get(`/movies/${movieId}`) as unknown as Record<string, unknown>;
            movieSetRef.current = true;
            setMovie({
              movie_id:          Number(m.movie_id ?? movieId),
              title:             String(m.title ?? movieTitle ?? ''),
              poster_url:        String(m.poster_url ?? FALLBACK_POSTER),
              backdrop_url:      String(m.backdrop_url ?? FALLBACK_BACKDROP),
              trailer_url:       m.trailer_url as string | undefined,
              age_rating:        m.age_rating  as string | undefined,
              duration_minutes:  Number(m.duration_minutes ?? 0),
              genres:            Array.isArray(m.genres) ? (m.genres as string[]) : [],
              description:       m.description as string | undefined,
            });
          } catch {
            if (!movieSetRef.current) {
              movieSetRef.current = true;
              setMovie({ movie_id: Number(movieId), title: movieTitle ?? 'Đang tải...', poster_url: FALLBACK_POSTER, backdrop_url: FALLBACK_BACKDROP });
            }
          }
        }
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? 'Không tải được sơ đồ ghế';
        setError(msg);
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => clearTimeout(id);
  }, [movieId, searchParams]);

  // ─── Seat toggle ─────────────────────────────────────────────────────────
  const handleSeatToggle = (seatId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) { next.delete(seatId); }
      else { if (next.size >= MAX_SEATS) return prev; next.add(seatId); }
      return next;
    });
  };

  // ─── Hold seats ──────────────────────────────────────────────────────────
  const handleHoldSeats = async (): Promise<number[] | null> => {
    const showtimeId = searchParams.get('showtimeId');
    if (!showtimeId || selectedIds.size === 0) return null;

    // FIX: nếu đã hold rồi thì trả về luôn, TUYỆT ĐỐI không gọi hold-many lần 2.
    // Đọc từ ref nên không dính stale state.
    if (heldIdsRef.current.length > 0) return heldIdsRef.current;
    if (inFlightRef.current) return null;

    inFlightRef.current = true;
    setHolding(true);
    setHoldError(null);
    try {
      const showtimeSeatIds = seats
        .filter((s) => selectedIds.has(String(s.id)))
        .map((s) => Number(s.id));

      // HoldManySeatsDto chỉ nhận { showtimeSeatIds, holdMinutes? }.
      // ValidationPipe (whitelist + forbidNonWhitelisted) sẽ trả 400 nếu gửi thừa showtimeId.
      const res = await axiosClient.post('/showtime-seats/hold-many', {
        showtimeSeatIds,
      }) as unknown as HoldItem[];

      // FIX: backend trả MẢNG HoldResponseDto[] -> map lấy holdId (string) sang number.
      const list = Array.isArray(res) ? res : [];
      const ids = list
        .map((h) => Number(h.holdId))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (!ids.length) {
        setHoldError('Backend không trả về mã giữ ghế. Vui lòng thử lại.');
        return null;
      }

      heldIdsRef.current = ids;
      setHeldIds(ids);
      startCountdown(list[0]?.expiresAt);
      return ids;
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Không thể giữ ghế';
      setHoldError(msg);
      return null;
    } finally {
      inFlightRef.current = false;
      setHolding(false);
    }
  };

  // ─── Proceed to payment ───────────────────────────────────────────────────
  const handleProceed = async () => {
    if (selectedIds.size === 0) return;
    if (navigating) return; // chặn double-click
    setNavigating(true);
    setNavError('');
    const showtimeId = searchParams.get('showtimeId');

    if (!showtimeId || usingMock) {
      const selectedSeatObjects = seats.filter((s) => selectedIds.has(String(s.id)));
      const totalAmount = selectedSeatObjects.reduce((sum, s) => sum + (s.price ?? 0), 0);
      const seatCodes   = selectedSeatObjects.map((s) => `${s.rowName}${s.seatNumber}`);
      const p = new URLSearchParams({
        seats: seatCodes.join(','),
        total: String(totalAmount),
        movieTitle: movie?.title ?? showtimeInfo?.movieTitle ?? 'Vé xem phim',
        ...(showtimeInfo?.cinemaName ? { cinema: showtimeInfo.cinemaName } : {}),
        ...(showtimeInfo?.roomName   ? { room:   showtimeInfo.roomName }   : {}),
        ...(showtimeInfo?.showDate   ? { date:   showtimeInfo.showDate }   : {}),
        ...(showtimeInfo?.showTime   ? { time:   showtimeInfo.showTime }   : {}),
      });
      navigate(`/payment/local?${p.toString()}`);
      setNavigating(false);
      return;
    }

    if (holdExpired) {
      setNavError('Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.');
      setNavigating(false);
      return;
    }

    try {
      // FIX: ưu tiên ref (giá trị mới nhất) thay vì state heldIds (bất đồng bộ).
      // Chỉ hold khi THỰC SỰ chưa hold — không còn cảnh gọi hold-many lần 2.
      let holdIds = heldIdsRef.current.length ? heldIdsRef.current : heldIds;

      if (!holdIds.length) {
        const newHoldIds = await handleHoldSeats();
        if (!newHoldIds || !newHoldIds.length) {
          // handleHoldSeats đã set holdError với thông báo cụ thể từ backend —
          // không ghi đè bằng thông báo chung chung nữa.
          setNavError(holdError ?? 'Không thể giữ ghế. Vui lòng thử lại.');
          setNavigating(false);
          return;
        }
        holdIds = newHoldIds;
      }

      // FIX LỖI 2 — luồng đúng: Chọn ghế → Giữ ghế → Đặt vé → COMBO → tạo booking → thanh toán.
      // Booking KHÔNG còn được tạo ở đây nữa; ComboPage sẽ gọi POST /bookings kèm
      // { holdIds, products } để bắp nước nằm cùng một đơn hàng với vé.
      navigate('/combo', {
        state: {
          holdIds,
          holdExpiresAt,
          showtimeId: Number(showtimeId),
          movieTitle: movie?.title ?? showtimeInfo?.movieTitle ?? 'Vé xem phim',
          posterUrl:  movie?.poster_url ?? null,
          cinemaName: showtimeInfo?.cinemaName ?? null,
          roomName:   showtimeInfo?.roomName   ?? null,
          showDate:   showtimeInfo?.showDate   ?? null,
          showTime:   showtimeInfo?.showTime   ?? null,
          seatCodes:  seats
            .filter((s) => selectedIds.has(String(s.id)))
            .map((s) => `${s.rowName}${s.seatNumber}`),
          seatTotal:  seats
            .filter((s) => selectedIds.has(String(s.id)))
            .reduce((sum, s) => sum + (s.price ?? 0), 0),
        },
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      setNavError(msg);
    } finally {
      setNavigating(false);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────
  const embedUrl            = getYoutubeEmbedUrl(movie?.trailer_url);
  const selectedSeatObjects = seats.filter((s) => selectedIds.has(String(s.id)));
  const totalPrice          = selectedSeatObjects.reduce((sum, s) => sum + (s.price ?? 0), 0);
  // FIX TS2322: SelectedSeatsBar cần Seat[] (seatId/seatCode/price), không phải SeatDto[]
  const selectedSeatBarItems: Seat[] = selectedSeatObjects.map((s) => ({
    seatId:   s.id,
    seatCode: `${s.rowName}${s.seatNumber}`,
    price:    s.price ?? 0,
    status:   s.status === 'BOOKED' ? 'SOLD' : (s.status === 'SELECTED' ? 'AVAILABLE' : s.status),
  }));
  // Ghế đang bị giữ (id dạng string) để SeatMap disable
  const heldSeatKeys = new Set(heldIds.map(String));
  const countdownMM         = String(Math.floor(holdCountdown / 60)).padStart(2, '0');
  const countdownSS         = String(holdCountdown % 60).padStart(2, '0');
  const countdownUrgent     = holdCountdown < 60 && heldIds.length > 0;

  // ─── Theme tokens ────────────────────────────────────────────────────────
  const bg        = darkMode ? 'bg-gray-950 text-white'      : 'bg-gray-50 text-gray-900';
  const card      = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const cardMuted = darkMode ? 'text-gray-400'               : 'text-gray-500';
  const divider   = darkMode ? 'border-gray-700'             : 'border-gray-200';

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>

      {/* ── Backdrop ── */}
      {movie?.backdrop_url && (
        <div className="relative h-44 md:h-60 overflow-hidden">
          <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — Thông tin phim + Phòng chiếu + Ngày giờ (tích hợp)
        ══════════════════════════════════════════════════════════════════ */}
        {(movie || showtimeInfo) && (
          <div className={`rounded-2xl border ${card} overflow-hidden`}>
            <div className="flex flex-col md:flex-row gap-0">

              {/* Poster */}
              {movie?.poster_url && (
                <div className="flex-shrink-0 md:w-36">
                  <img
                    src={movie.poster_url}
                    alt={movie?.title ?? ''}
                    className="w-full md:h-full object-cover max-h-52 md:max-h-none"
                  />
                </div>
              )}

              {/* Info chính */}
              <div className="flex-1 p-5 flex flex-col justify-between gap-4">

                {/* Tên phim + badge */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold leading-tight">
                      {movie?.title ?? showtimeInfo?.movieTitle ?? ''}
                    </h1>
                    {movie?.age_rating && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500 text-white uppercase tracking-wide">
                        {movie.age_rating}
                      </span>
                    )}
                  </div>
                  {movie?.genres && movie.genres.length > 0 && (
                    <p className={`text-sm ${cardMuted}`}>{movie.genres.join(' • ')}</p>
                  )}
                  {movie?.duration_minutes && movie.duration_minutes > 0 ? (
                    <p className={`text-sm ${cardMuted}`}>⏱ {movie.duration_minutes} phút</p>
                  ) : null}
                </div>

                {/* Divider */}
                <div className={`border-t ${divider}`} />

                {/* Phòng chiếu + Ngày giờ — grid 2 cột */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {showtimeInfo?.cinemaName && (
                    <div className="col-span-2 md:col-span-4">
                      <span className={`block text-xs uppercase tracking-wider font-semibold mb-0.5 ${cardMuted}`}>Rạp chiếu</span>
                      <span className="font-medium">🎬 {showtimeInfo.cinemaName}</span>
                    </div>
                  )}
                  {showtimeInfo?.roomName && (
                    <div>
                      <span className={`block text-xs uppercase tracking-wider font-semibold mb-0.5 ${cardMuted}`}>Phòng</span>
                      <span className="font-medium">🚪 {showtimeInfo.roomName}</span>
                    </div>
                  )}
                  {showtimeInfo?.showDate && (
                    <div>
                      <span className={`block text-xs uppercase tracking-wider font-semibold mb-0.5 ${cardMuted}`}>Ngày chiếu</span>
                      <span className="font-medium">📅 {showtimeInfo.showDate}</span>
                    </div>
                  )}
                  {showtimeInfo?.showTime && (
                    <div>
                      <span className={`block text-xs uppercase tracking-wider font-semibold mb-0.5 ${cardMuted}`}>Giờ chiếu</span>
                      <span className="font-medium">⏰ {showtimeInfo.showTime}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Trailer */}
        {embedUrl && (
          <div className="rounded-2xl overflow-hidden aspect-video">
            <iframe
              src={embedUrl}
              title="Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Mock warning */}
        {usingMock && (
          <div className="rounded-xl px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm">
            ⚠️ Đang dùng dữ liệu ghế mẫu. Kết quả đặt vé sẽ không được lưu.
          </div>
        )}
        {error && !usingMock && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — SeatMap (trái) + Panel giữ ghế (phải)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── SeatMap ── */}
          <div className="flex-1 min-w-0">
            <SeatMap
              seats={seats}
              selectedIds={selectedIds}
              onSeatToggle={handleSeatToggle}
              maxSeats={MAX_SEATS}
              heldIds={heldSeatKeys}
            />
          </div>

          {/* ── Panel giữ ghế ── */}
          <div className={`w-full lg:w-72 rounded-2xl border ${card} p-5 space-y-4 sticky top-4`}>

            <h2 className="text-base font-bold">Tóm tắt đặt vé</h2>

            {/* Countdown */}
            {heldIds.length > 0 ? (
              <div className={`rounded-xl px-4 py-3 text-center font-mono font-bold text-lg border ${
                countdownUrgent
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                <div className="text-xs font-sans font-normal mb-0.5 opacity-70">Thời gian giữ ghế</div>
                ⏳ {countdownMM}:{countdownSS}
              </div>
            ) : (
              <div className={`rounded-xl px-4 py-3 text-center text-sm border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
                <div>Chưa giữ ghế</div>
                <div className="text-xs mt-0.5 opacity-60">Mặc định {HOLD_SECONDS / 60} phút sau khi nhấn giữ</div>
              </div>
            )}

            {/* Ghế đã chọn */}
            <div className="space-y-1.5">
              <div className={`text-xs uppercase tracking-wider font-semibold ${cardMuted}`}>
                Ghế đã chọn ({selectedSeatObjects.length}/{MAX_SEATS})
              </div>
              {selectedSeatObjects.length === 0 ? (
                <p className={`text-sm ${cardMuted}`}>Chưa chọn ghế nào</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeatObjects.map((s) => (
                    <span
                      key={s.id}
                      className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        s.type === 'VIP'
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : 'bg-green-500/20 text-green-500 border border-green-500/30'
                      }`}
                    >
                      {s.rowName}{s.seatNumber}
                      <span className="ml-1 opacity-60">{s.type === 'VIP' ? 'VIP' : 'STD'}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={`border-t ${divider}`} />

            {/* Giá */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${cardMuted}`}>Tổng tiền</span>
              <span className="text-lg font-bold text-amber-500">{formatVND(totalPrice)}</span>
            </div>

            {/* Lỗi hold */}
            {holdError && (
              <div className="rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {holdError}
              </div>
            )}
            {holdExpired && (
              <div className="rounded-lg px-3 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs">
                ⌛ Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.
              </div>
            )}
            {navError && (
              <div className="rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {navError}
              </div>
            )}

            {/* Button giữ ghế */}
            {!heldIds.length && !usingMock && searchParams.get('showtimeId') && (
              <button
                onClick={handleHoldSeats}
                disabled={holding || selectedIds.size === 0}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedIds.size === 0 || holding
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow'
                }`}
              >
                {holding ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang giữ…
                  </span>
                ) : '🔒 Giữ ghế (300s)'}
              </button>
            )}

            {/* Button đặt vé */}
            <button
              onClick={handleProceed}
              disabled={navigating || selectedIds.size === 0}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                selectedIds.size === 0 || navigating
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-gray-950 active:scale-95 shadow-lg shadow-amber-500/20'
              }`}
            >
              {navigating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  Đang xử lý…
                </span>
              ) : `Đặt vé →`}
            </button>

          </div>{/* end panel */}
        </div>{/* end flex row */}

      </div>

      {/* ── Bottom bar (mobile) ── */}
      <SelectedSeatsBar
        seats={selectedSeatBarItems}
        totalPrice={totalPrice}
        holdCountdown={heldIds.length > 0 ? holdCountdown : null}
        onProceed={handleProceed}
        holding={holding}
        navigating={navigating}
      />

    </div>
  );
}
