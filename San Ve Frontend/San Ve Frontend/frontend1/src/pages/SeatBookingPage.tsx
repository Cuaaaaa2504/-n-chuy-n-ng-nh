// src/pages/SeatBookingPage.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useTheme } from "../context/useTheme";
import type { SeatDto } from "../types/seat.types";
import type { Seat } from "../hooks/useSeatHold";
import axiosClient from "../api/axiosClient";
// FIX BUG-08: dùng wrapper seatService thay vì tự gọi axiosClient — logic hold
// và lấy seatmap chỉ còn tồn tại ở MỘT nơi (src/api/seat.service.ts).
import { seatService } from "../api/seat.service";
import type { HoldItem } from "../api/seat.service";

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

// FIX BUG-03/BUG-08: interface SeatMapResponse cục bộ đã bị xoá.
// Kiểu chuẩn nay nằm ở `api/seat.service.ts` và khớp 1-1 với DTO của backend
// (`showtime-seats/dto/seat-map-response.dto.ts`) — không còn 2 định nghĩa lệch nhau.

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
// FIX BUG-08: HoldItem nay được export từ `api/seat.service.ts` — trước đây
// interface này bị khai báo trùng ở cả 2 file, đổi một bên là lệch bên kia.

/**
 * FIX BUG-04: trước đây có 3 nhánh rơi vào generateMockSeats() mà KHÔNG log gì cả
 * -> dev nhìn banner vàng "đang dùng ghế mẫu" nhưng không biết vì mất mạng, vì
 * suất chiếu chưa sinh ghế, hay vì URL thiếu showtimeId. Debug trên staging gần
 * như bất khả thi.
 *
 * Mọi nhánh fallback nay đều đi qua đây và in ra lý do cụ thể.
 */
type MockReason =
  | 'NO_SHOWTIME_ID'
  | 'SEATS_NOT_GENERATED'
  | 'EMPTY_SEAT_LIST'
  | 'API_ERROR';

const MOCK_REASON_TEXT: Record<MockReason, string> = {
  NO_SHOWTIME_ID:
    'URL không có tham số ?showtimeId — trang được mở trực tiếp, không đi qua màn chọn suất chiếu.',
  SEATS_NOT_GENERATED:
    'Suất chiếu tồn tại nhưng CHƯA được sinh ghế (bảng showtime_seats rỗng). ' +
    'Admin cần gọi POST /showtimes/admin/:id/generate-seats để vá dữ liệu cũ.',
  EMPTY_SEAT_LIST: 'Backend trả về danh sách ghế rỗng.',
  API_ERROR: 'Gọi GET /showtime-seats/:showtimeId thất bại.',
};

/** Thông báo hiển thị cho người dùng cuối, tương ứng từng lý do */
const MOCK_REASON_USER_TEXT: Record<MockReason, string> = {
  NO_SHOWTIME_ID: 'Chưa chọn suất chiếu. Vui lòng quay lại và chọn suất chiếu.',
  SEATS_NOT_GENERATED: 'Suất chiếu này chưa có sơ đồ ghế. Vui lòng liên hệ quản trị viên.',
  EMPTY_SEAT_LIST: 'Suất chiếu này chưa có sơ đồ ghế.',
  API_ERROR: 'Không tải được sơ đồ ghế từ máy chủ.',
};

function logMockFallback(reason: MockReason, detail?: unknown) {
  console.warn(
    `[SeatBookingPage] Fallback sang ghế mẫu — ${reason}: ${MOCK_REASON_TEXT[reason]}`,
    detail ?? '',
  );
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
  const [heldIds, setHeldIds]                 = useState<string[]>([]);
  const [holdCountdown, setHoldCountdown]     = useState<number>(HOLD_SECONDS);
  const [holdExpired, setHoldExpired]         = useState(false);
  const [holding, setHolding]                 = useState(false);
  const [navigating, setNavigating]           = useState(false);
  const [navError, setNavError]               = useState<string>('');
  const [usingMock, setUsingMock]             = useState(false);
  // FIX BUG-04: lưu lý do rơi vào mock để hiện đúng thông báo cho người dùng
  const [mockReason, setMockReason]           = useState<MockReason | null>(null);
  const [holdExpiresAt, setHoldExpiresAt]     = useState<string | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const movieSetRef = useRef(false);
  // FIX: ref phản chiếu heldIds — đọc được giá trị MỚI NHẤT ngay trong cùng tick,
  // không phải chờ React re-render. Chặn hoàn toàn việc hold lần 2 do state async.
  const heldIdsRef = useRef<string[]>([]);
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
        logMockFallback('NO_SHOWTIME_ID');
        setSeats(generateMockSeats());
        setUsingMock(true);
        setMockReason('NO_SHOWTIME_ID');
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
        // FIX BUG-08: gọi qua wrapper thay vì axiosClient trực tiếp.
        // Wrapper đã lo việc normalize ghế + suy ra seatsGenerated.
        const data = await seatService.getSeatMap(showtimeId);

        const seatList   = data.seats;
        const movieTitle = data.movieTitle ?? null;
        const cinemaName = data.cinemaName ?? qCinema ?? null;
        const roomName   = data.roomName   ?? qRoom   ?? null;
        // FIX: backend trả `startTime` dạng ISO chứ không có showDate/showTime.
        // Code cũ đọc `data.showDate` -> luôn undefined, âm thầm rơi về query param.
        const startIso = data.startTime ? new Date(data.startTime) : null;
        const validStart = startIso && !Number.isNaN(startIso.getTime()) ? startIso : null;
        const pad = (n: number) => String(n).padStart(2, '0');
        const showDate = validStart
          ? `${validStart.getFullYear()}-${pad(validStart.getMonth() + 1)}-${pad(validStart.getDate())}`
          : (qDate ?? null);
        const showTime = validStart
          ? `${pad(validStart.getHours())}:${pad(validStart.getMinutes())}`
          : (qTime ?? null);

        setShowtimeInfo({ showtimeId: Number(showtimeId), movieTitle, cinemaName, roomName, showDate, showTime });

        if (seatList.length === 0) {
          // FIX BUG-02 + BUG-04: nhờ cờ `seatsGenerated` từ backend, ta phân biệt
          // được "suất chiếu chưa sinh ghế" với "danh sách rỗng vì lý do khác".
          const reason: MockReason = data.seatsGenerated
            ? 'EMPTY_SEAT_LIST'
            : 'SEATS_NOT_GENERATED';
          logMockFallback(reason, { showtimeId, totalSeats: data.totalSeats });
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
          setMockReason(reason);
        } else {
          setSeats(seatList);
          setUsingMock(false);
          setMockReason(null);
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
        logMockFallback('API_ERROR', err);
        setError(msg);
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
        setMockReason('API_ERROR');
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
  const handleHoldSeats = async (): Promise<string[] | null> => {
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

      // FIX BUG-08: gọi seatService.holdSeats() thay vì lặp lại lời gọi axios.
      // Wrapper tự bảo đảm body đúng { showtimeSeatIds } và luôn trả về mảng.
      const list: HoldItem[] = await seatService.holdSeats(showtimeSeatIds);
      // FIX [BUG-03]: holdId là BIGINT -> giữ nguyên string, KHÔNG Number().
      const ids = list
        .map((h) => String(h.holdId ?? '').trim())
        .filter((id) => /^\d+$/.test(id));

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
  const pageSurface = darkMode
    ? 'bg-[#05070d] text-[#e8e0e7]'
    : 'bg-[#080a12] text-[#f4eef7]';

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageSurface}`}>
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-secondary border-t-transparent animate-spin shadow-[0_0_24px_rgba(76,215,246,0.35)]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-x-hidden pb-28 lg:pb-12 ${pageSurface}`}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-48 top-40 h-[420px] w-[420px] rounded-full bg-primary-container/10 blur-[140px]" />
        <div className="absolute -right-40 top-[35%] h-[420px] w-[420px] rounded-full bg-secondary/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {movie?.backdrop_url && (
        <div className="relative h-[250px] md:h-[330px] overflow-hidden">
          <img
            src={movie.backdrop_url}
            alt=""
            className="h-full w-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/25 via-[#05070d]/65 to-[#05070d]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070d] via-transparent to-[#05070d]/80" />
        </div>
      )}

      <main
        className={`relative z-10 mx-auto w-full max-w-[1280px] px-5 md:px-8 ${
          movie?.backdrop_url ? '-mt-36 md:-mt-48' : 'pt-8'
        }`}
      >
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#151821]/80 shadow-[0_22px_80px_rgba(0,0,0,0.48),0_0_35px_rgba(221,183,255,0.08)] backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row">
            {movie?.poster_url && (
              <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-auto md:w-40">
                <img
                  src={movie.poster_url}
                  alt={movie?.title ?? ''}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151821] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#151821]/30" />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 p-5 md:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 font-label-sm text-[11px] uppercase tracking-[0.16em] text-secondary shadow-[0_0_18px_rgba(76,215,246,0.12)]">
                      Chọn ghế
                    </span>
                    {movie?.age_rating && (
                      <span className="rounded-md border border-error/35 bg-error/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-error">
                        {movie.age_rating}
                      </span>
                    )}
                  </div>

                  <h1 className="truncate font-headline-lg text-2xl font-bold text-primary-container drop-shadow-[0_0_12px_rgba(221,183,255,0.35)] md:text-3xl">
                    {movie?.title ?? showtimeInfo?.movieTitle ?? 'Thông tin suất chiếu'}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                    {movie?.duration_minutes && movie.duration_minutes > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                        {movie.duration_minutes} phút
                      </span>
                    ) : null}
                    {movie?.genres && movie.genres.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-secondary">movie</span>
                        {movie.genres.join(' • ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-label-sm uppercase tracking-[0.12em] text-on-surface-variant">
                  <span className="flex items-center gap-2 text-primary">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 bg-primary/15">1</span>
                    Chọn ghế
                  </span>
                  <span className="h-px w-6 bg-white/15" />
                  <span className="flex items-center gap-2 opacity-55">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15">2</span>
                    Thanh toán
                  </span>
                  <span className="h-px w-6 bg-white/15" />
                  <span className="flex items-center gap-2 opacity-55">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15">3</span>
                    Hoàn tất
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
                {showtimeInfo?.cinemaName && (
                  <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 sm:col-span-1">
                    <span className="block font-label-sm text-[10px] uppercase tracking-[0.15em] text-outline">Rạp chiếu</span>
                    <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
                      <span className="truncate">{showtimeInfo.cinemaName}</span>
                    </span>
                  </div>
                )}
                {showtimeInfo?.roomName && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="block font-label-sm text-[10px] uppercase tracking-[0.15em] text-outline">Phòng</span>
                    <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px] text-secondary">meeting_room</span>
                      {showtimeInfo.roomName}
                    </span>
                  </div>
                )}
                {showtimeInfo?.showDate && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="block font-label-sm text-[10px] uppercase tracking-[0.15em] text-outline">Ngày chiếu</span>
                    <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px] text-secondary">calendar_month</span>
                      {showtimeInfo.showDate}
                    </span>
                  </div>
                )}
                {showtimeInfo?.showTime && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="block font-label-sm text-[10px] uppercase tracking-[0.15em] text-outline">Giờ chiếu</span>
                    <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                      {showtimeInfo.showTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {embedUrl && (
          <details className="group mb-6 rounded-2xl border border-white/10 bg-white/[0.025]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-on-surface-variant">
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">play_circle</span>
                Xem trailer trước khi chọn ghế
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="aspect-video overflow-hidden border-t border-white/10">
              <iframe
                src={embedUrl}
                title="Trailer"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </details>
        )}

        {usingMock && (
          <div className="mb-6 rounded-2xl border border-tertiary/30 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
            <p className="font-semibold">Dữ liệu ghế mẫu, thao tác đặt vé sẽ không được lưu.</p>
            {mockReason && (
              <p className="mt-1 text-tertiary/75">{MOCK_REASON_USER_TEXT[mockReason]}</p>
            )}
          </div>
        )}

        {error && !usingMock && (
          <div className="mb-6 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <SeatMap
              seats={seats}
              selectedIds={selectedIds}
              onSeatToggle={handleSeatToggle}
              maxSeats={MAX_SEATS}
              heldIds={heldSeatKeys}
            />
          </div>

          <aside className="hidden overflow-hidden rounded-3xl lg:sticky lg:top-24 lg:block border border-white/10 bg-[#121722]/88 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(76,215,246,0.06)] backdrop-blur-2xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-primary-container/10 to-secondary/5 px-6 py-5">
              <p className="font-label-sm text-[10px] uppercase tracking-[0.18em] text-secondary">Đơn hàng của bạn</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">Tóm tắt đặt vé</h2>
            </div>

            <div className="space-y-5 p-6">
              {heldIds.length > 0 ? (
                <div
                  className={`rounded-2xl border px-4 py-4 text-center ${
                    countdownUrgent
                      ? 'border-error/40 bg-error/10 text-error shadow-[0_0_24px_rgba(255,180,171,0.1)]'
                      : 'border-tertiary/35 bg-tertiary/10 text-tertiary shadow-[0_0_24px_rgba(231,231,133,0.08)]'
                  }`}
                >
                  <div className="mb-1 font-label-sm text-[10px] uppercase tracking-[0.15em] opacity-75">Thời gian giữ ghế</div>
                  <div className="font-mono text-3xl font-bold tracking-wider">
                    {countdownMM}:{countdownSS}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-center text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined mb-1 text-2xl text-outline">timer</span>
                  <div>Chưa giữ ghế</div>
                  <div className="mt-1 text-xs text-outline">
                    Thời gian giữ ghế là {HOLD_SECONDS / 60} phút
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-label-sm text-[11px] uppercase tracking-[0.14em] text-outline">
                    Ghế đã chọn
                  </span>
                  <span className="rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary">
                    {selectedSeatObjects.length}/{MAX_SEATS}
                  </span>
                </div>

                {selectedSeatObjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-outline">
                    Chọn ghế trên sơ đồ để tiếp tục
                  </div>
                ) : (
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                    {selectedSeatObjects.map((s) => (
                      <span
                        key={s.id}
                        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                          s.type === 'VIP'
                            ? 'border-tertiary/35 bg-tertiary/10 text-tertiary'
                            : 'border-secondary/35 bg-secondary/10 text-secondary'
                        }`}
                      >
                        {s.rowName}{s.seatNumber}
                        <span className="text-[9px] font-normal opacity-65">{s.type === 'VIP' ? 'VIP' : 'STD'}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-label-sm text-[10px] uppercase tracking-[0.14em] text-outline">Tổng thanh toán</div>
                  <div className="mt-1 text-xs text-on-surface-variant">Đã gồm giá ghế</div>
                </div>
                <span className="text-2xl font-extrabold text-tertiary drop-shadow-[0_0_10px_rgba(231,231,133,0.25)]">
                  {formatVND(totalPrice)}
                </span>
              </div>

              {holdError && (
                <div className="rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs text-error">
                  {holdError}
                </div>
              )}
              {holdExpired && (
                <div className="rounded-xl border border-tertiary/25 bg-tertiary/10 px-3 py-2 text-xs text-tertiary">
                  Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.
                </div>
              )}
              {navError && (
                <div className="rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs text-error">
                  {navError}
                </div>
              )}

              {!heldIds.length && !usingMock && searchParams.get('showtimeId') && (
                <button
                  onClick={handleHoldSeats}
                  disabled={holding || selectedIds.size === 0}
                  className="btn-secondary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-title-md text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-outline disabled:shadow-none"
                >
                  {holding ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                      Đang giữ ghế
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[19px]">lock_clock</span>
                      Giữ ghế
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleProceed}
                disabled={navigating || selectedIds.size === 0}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-title-md text-sm uppercase tracking-wide shadow-[0_0_24px_rgba(221,183,255,0.18)] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/[0.06] disabled:text-outline disabled:shadow-none"
              >
                {navigating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                    Đang xử lý
                  </>
                ) : (
                  <>
                    Đặt vé
                    <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-outline">
                Ghế chỉ được xác nhận sau khi thanh toán thành công.
              </p>
            </div>
          </aside>
        </section>
      </main>

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
