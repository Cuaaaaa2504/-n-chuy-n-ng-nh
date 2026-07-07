// src/pages/SeatBookingPage.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import type { Seat } from "../hooks/useSeatHold";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto, SeatStatus } from "../types/seat.types";
import axiosClient from "../api/axiosClient";

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
        // FIX TS2322: id là string (kết hợp row+col) — khớp với SeatDto id: number | string
        id:         `${row}${col}`,
        rowName:    row,
        seatNumber: col,
        type:       t,
        status:     'AVAILABLE' as SeatStatus,
        price:      t === 'VIP' ? 120_000 : 90_000,
      });
    }
  }
  return seats;
}

function getYoutubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)?([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0` : null;
}

interface SeatMapResponse {
  showtimeId?: number;
  movieTitle?: string | null;
  cinemaName?: string | null;
  roomName?:   string | null;
  showDate?:   string | null;
  showTime?:   string | null;
  seats?: SeatDto[];
  data?: {
    seats?: SeatDto[];
    movieTitle?: string | null;
    cinemaName?: string | null;
    roomName?:   string | null;
    showDate?:   string | null;
    showTime?:   string | null;
  };
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
}

// FIX: type cho response giữ ghế
interface HoldResponse {
  holdIds?: number[];
  data?: { holdIds?: number[] } | number[];
}

export default function SeatBookingPage() {
  const { id: movieId }             = useParams<{ id: string }>();
  const [searchParams]              = useSearchParams();
  const { darkMode }                = useTheme();

  const [movie, setMovie]           = useState<MovieInfo | null>(null);
  const [seats, setSeats]           = useState<SeatDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showtimeInfo, setShowtimeInfo] = useState<ShowtimeInfo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [holdError, setHoldError]   = useState<string | null>(null);
  const [heldIds, setHeldIds]       = useState<number[]>([]);
  const [holdCountdown, setHoldCountdown] = useState<number>(HOLD_SECONDS);
  const [holding, setHolding]       = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError]     = useState<string>('');
  const [usingMock, setUsingMock]   = useState(false);
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null);
  const movieSetRef                 = useRef(false);

  const navigate = useNavigate();

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setHoldCountdown(HOLD_SECONDS);
    timerRef.current = setInterval(() => {
      setHoldCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setHeldIds([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // FIX react-hooks/set-state-in-effect: setState trong effect này là đúng pattern vì
  // đây là reset state khi movieId thay đổi — không phải data-fetching thuần túy
  useEffect(() => {
    movieSetRef.current = false;
    // Dùng functional updates để tránh stale closure warning
    setSelectedIds(new Set());
    setHeldIds([]);
    setHoldCountdown(HOLD_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);

    const load = async () => {
      setLoading(true);
      setError(null);
      const showtimeId = searchParams.get('showtimeId');

      const qDate   = searchParams.get('date')   ?? null;
      const qCinema = searchParams.get('cinema')  ?? null;
      const qTime   = searchParams.get('time')    ?? null;
      const qRoom   = searchParams.get('room')    ?? null;

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
        const raw = await axiosClient.get<SeatMapResponse>(`/showtime-seats/${showtimeId}`);
        const data: SeatMapResponse = (raw as Record<string, unknown>)?.data as SeatMapResponse ?? raw as unknown as SeatMapResponse;

        const seatList: SeatDto[] =
          data.seats ??
          data.data?.seats ??
          [];

        const movieTitle = data.movieTitle ?? data.data?.movieTitle ?? null;
        const cinemaName = data.cinemaName ?? data.data?.cinemaName ?? qCinema ?? null;
        const roomName   = data.roomName   ?? data.data?.roomName   ?? qRoom   ?? null;
        const showDate   = data.showDate   ?? data.data?.showDate   ?? qDate   ?? null;
        const showTime   = data.showTime   ?? data.data?.showTime   ?? qTime   ?? null;

        setShowtimeInfo({
          showtimeId: Number(showtimeId),
          movieTitle,
          cinemaName,
          roomName,
          showDate,
          showTime,
        });

        if (seatList.length === 0) {
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
        } else {
          setSeats(seatList);
          setUsingMock(false);
        }

        if (movieId && !movieSetRef.current) {
          try {
            const mRaw = await axiosClient.get(`/movies/${movieId}`);
            const m = (mRaw as Record<string, unknown>)?.data ?? mRaw as Record<string, unknown>;
            movieSetRef.current = true;
            setMovie({
              movie_id: Number((m as Record<string, unknown>).movie_id ?? movieId),
              title: String((m as Record<string, unknown>).title ?? movieTitle ?? ''),
              poster_url: String((m as Record<string, unknown>).poster_url ?? FALLBACK_POSTER),
              backdrop_url: String((m as Record<string, unknown>).backdrop_url ?? FALLBACK_BACKDROP),
              trailer_url: (m as Record<string, unknown>).trailer_url as string | undefined,
              age_rating: (m as Record<string, unknown>).age_rating as string | undefined,
              duration_minutes: Number((m as Record<string, unknown>).duration_minutes ?? 0),
            });
          } catch {
            if (!movieSetRef.current) {
              movieSetRef.current = true;
              setMovie({
                movie_id: Number(movieId),
                title: movieTitle ?? 'Đang tải...',
                poster_url: FALLBACK_POSTER,
                backdrop_url: FALLBACK_BACKDROP,
              });
            }
          }
        } else if (movieTitle && !movieSetRef.current) {
          movieSetRef.current = true;
          setMovie({
            movie_id: Number(showtimeId),
            title: movieTitle,
            poster_url: FALLBACK_POSTER,
            backdrop_url: FALLBACK_BACKDROP,
          });
        }

      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError('Không thể tải sơ đồ ghế. Đang dùng dữ liệu mẫu.');
        }
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
        if (!movieSetRef.current) {
          movieSetRef.current = true;
          setMovie({
            movie_id: Number(movieId ?? 0),
            title: searchParams.get('title') ?? 'Chọn ghế',
            poster_url: FALLBACK_POSTER,
            backdrop_url: FALLBACK_BACKDROP,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, searchParams]);

  // FIX TS2367: so sánh đúng kiểu — SeatStatus enum chứa 'BOOKED' rồi
  const handleSeatClick = (seatId: string) => {
    setSelectedIds((prev) => {
      const seat = seats.find((s) => String(s.id) === seatId);
      if (!seat) return prev;
      // FIX TS2367: cast về SeatStatus để so sánh chính xác
      const status = seat.status as SeatStatus;
      if (status === 'BOOKED' || status === 'HELD' || status === 'SOLD' || status === 'BLOCKED') return prev;
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        if (next.size >= MAX_SEATS) return prev;
        next.add(seatId);
      }
      return next;
    });
  };

  const handleHoldSeats = async () => {
    if (selectedIds.size === 0) {
      setHoldError('Vui lòng chọn ít nhất 1 ghế.');
      return;
    }
    setHolding(true);
    setHoldError(null);
    try {
      const showtimeId = searchParams.get('showtimeId') ?? movieId ?? '';
      const showtimeSeatIds = Array.from(selectedIds).map(Number);
      const res = await axiosClient.post('/showtime-seats/hold-many', {
        showtimeSeatIds,
        showtimeId: Number(showtimeId),
        holdMinutes: Math.ceil(HOLD_SECONDS / 60),
      }) as HoldResponse;
      // FIX no-explicit-any: dùng HoldResponse type
      const dataField = res.data;
      const ids: number[] | undefined =
        res.holdIds ??
        (Array.isArray(dataField) ? dataField as number[] : (dataField as { holdIds?: number[] })?.holdIds);
      if (ids && Array.isArray(ids) && ids.length > 0) {
        setHeldIds(ids);
      } else {
        setHeldIds(showtimeSeatIds);
      }
      startCountdown();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ?? '';
      setHoldError(`Giữ ghế thất bại: ${msg}`);
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
    setNavError('');
    try {
      const res = await axiosClient.post('/bookings', { holdIds: heldIds }) as Record<string, unknown>;
      const bookingId =
        res.bookingId ??
        (res.data as Record<string, unknown> | undefined)?.bookingId ??
        res.id ??
        (res.data as Record<string, unknown> | undefined)?.id;
      if (!bookingId && bookingId !== 0) {
        setNavError('Không nhận được mã đặt vé từ server. Vui lòng thử lại.');
        setNavigating(false);
        return;
      }
      navigate(`/payment/${String(bookingId)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ?? '';
      setNavError(`Lỗi đặt vé: ${msg}`);
      setNavigating(false);
    }
  };

  // FIX TS2345: dùng String(s.id) để so sánh với Set<string>
  const selectedSeats = seats.filter((s) => selectedIds.has(String(s.id)));

  const selectedSeatsForBar: Seat[] = selectedSeats.map((s) => ({
    seatId:   String(s.id),
    seatCode: `${s.rowName}${s.seatNumber}`,
    price:    s.price ?? 90_000,
    status:   s.status as Seat['status'],
  }));

  const totalAmount     = selectedSeatsForBar.reduce((sum, s) => sum + s.price, 0);
  const trailerEmbedUrl = movie ? getYoutubeEmbedUrl(movie.trailer_url) : null;

  const mm = String(Math.floor(holdCountdown / 60)).padStart(2, '0');
  const ss = String(holdCountdown % 60).padStart(2, '0');
  const countdownStr = `${mm}:${ss}`;

  const bg   = darkMode ? 'bg-gray-950 text-white'        : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border border-gray-700/40' : 'bg-white border border-gray-200 shadow-sm';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {movie?.backdrop_url && (
        <div
          className="absolute inset-0 h-64 bg-cover bg-center opacity-20 pointer-events-none"
          style={{ backgroundImage: `url('${movie.backdrop_url}')` }}
        />
      )}

      <div className="relative max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start gap-4">
          <img
            src={movie?.poster_url ?? FALLBACK_POSTER}
            alt={movie?.title ?? 'Poster'}
            className="w-20 h-28 object-cover rounded-xl shadow-lg flex-shrink-0"
          />
          <div>
            <h1 className="text-2xl font-bold">{movie?.title ?? showtimeInfo?.movieTitle ?? 'Chọn ghế'}</h1>
            {movie?.age_rating && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500 text-white">{movie.age_rating}</span>
            )}
            {showtimeInfo && (
              <div className="text-sm opacity-70 mt-1 space-y-0.5">
                {showtimeInfo.cinemaName && <p>Rạp: {showtimeInfo.cinemaName}</p>}
                {showtimeInfo.roomName   && <p>Phòng: {showtimeInfo.roomName}</p>}
                {showtimeInfo.showDate   && <p>Ngày: {showtimeInfo.showDate} {showtimeInfo.showTime ?? ''}</p>}
              </div>
            )}
          </div>
        </div>

        {usingMock && (
          <div className="rounded-xl px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
            ⚠️ Đang dùng dữ liệu mẫu (không tìm được sơ đồ ghế từ server)
          </div>
        )}
        {error && (
          <div className="rounded-xl px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
        )}

        {trailerEmbedUrl && (
          <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
            <iframe
              src={trailerEmbedUrl}
              title="Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* FIX TS2322: SeatMap nhận onSeatClick và selectedIds (đã thêm vào SeatMapProps) */}
        <div className={`rounded-2xl p-4 ${card}`}>
          <SeatMap
            seats={seats}
            selectedSeats={Array.from(selectedIds).map(Number)}
            onSeatSelect={(seatId: number) => handleSeatClick(String(seatId))}
            onSeatClick={handleSeatClick}
            selectedIds={selectedIds}
          />
        </div>

        {holdError && (
          <div className="rounded-xl px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{holdError}</div>
        )}

        {heldIds.length > 0 && holdCountdown > 0 && (
          <div className="text-center text-sm font-mono font-bold text-yellow-500">
            ⏳ Thời gian giữ ghế còn lại: {countdownStr}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { void handleHoldSeats(); }}
            disabled={holding || selectedIds.size === 0}
            className="flex-1 py-3 rounded-2xl font-semibold transition bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black"
          >
            {holding ? 'Đang giữ...' : `Giữ ${selectedIds.size} ghế`}
          </button>
          <button
            onClick={() => { void handleContinueToPayment(); }}
            disabled={navigating || heldIds.length === 0}
            className="flex-1 py-3 rounded-2xl font-bold transition bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white"
          >
            {navigating ? 'Đang xử lý...' : 'Đặt vé'}
          </button>
        </div>

        {navError && (
          <div className="rounded-xl px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{navError}</div>
        )}

        {selectedSeatsForBar.length > 0 && (
          <SelectedSeatsBar seats={selectedSeatsForBar} total={totalAmount} />
        )}
      </div>
    </div>
  );
}
