// src/pages/SeatBookingPage.tsx

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useSeatSelection } from "../hooks/useSeatSelection";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";
import type { Seat } from "../hooks/useSeatHold";
import axiosClient from "../api/axiosClient";
// FIX: Xóa import mockMovies — dùng API thực để lấy thông tin phim

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

type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

interface SeatDto2 {
  id: string;
  rowName: string;
  seatNumber: number;
  type: string;
  status: SeatStatus;
  price?: number;
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

// FIX: interface MovieInfo thay thế mockMovies
interface MovieInfo {
  movie_id: number;
  title: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  age_rating?: string;
  duration_minutes?: number;
}

function getSelectedSeats(seats: SeatDto[]): SeatDto[] {
  return seats.filter((s) => (s as SeatDto2).status === 'HELD');
}

export default function SeatBookingPage() {
  const { id }                      = useParams<{ id: string }>();
  const [searchParams]              = useSearchParams();
  const { darkMode }                = useTheme();

  // FIX: movie state lấy từ API thay vì mockMovies
  const [movie, setMovie] = useState<MovieInfo | null>(null);

  const [seats, setSeats]         = useState<SeatDto[]>([]);
  const [showtimeInfo, setShowtimeInfo] = useState<ShowtimeInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [heldIds, setHeldIds]     = useState<number[]>([]);
  const [holdCountdown, setHoldCountdown] = useState<number>(HOLD_SECONDS);
  const [holding, setHolding]     = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError]   = useState<string>('');
  const [usingMock, setUsingMock] = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useLayoutEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const showtimeId = searchParams.get('showtimeId') ?? id;
      if (!showtimeId) {
        setSeats(generateMockSeats());
        setUsingMock(true);
        setLoading(false);
        return;
      }
      try {
        const data = await axiosClient.get<SeatMapResponse>(`/showtime-seats/${showtimeId}`) as unknown as SeatMapResponse;
        // FIX: set movie info từ seatMap response (movieTitle) hoặc fallback gọi /movies/:id
        if (data?.movieTitle) {
          setMovie((prev) => prev ?? {
            movie_id: Number(showtimeId),
            title: data.movieTitle ?? '',
            poster_url: undefined,
            backdrop_url: undefined,
          });
        } else if (id) {
          try {
            const mRaw = await axiosClient.get(`/movies/${id}`) as Record<string, unknown>;
            const m = (mRaw as any)?.data ?? mRaw;
            setMovie({
              movie_id: Number((m as any).movie_id ?? id),
              title: String((m as any).title ?? ''),
              poster_url: (m as any).poster_url,
              backdrop_url: (m as any).backdrop_url,
              trailer_url: (m as any).trailer_url,
              age_rating: (m as any).age_rating,
              duration_minutes: (m as any).duration_minutes,
            });
          } catch { /* fallback poster/title ở null */ }
        }

        const seatList: SeatDto[] = data.seats ?? data.data?.seats ?? [];
        if (seatList.length === 0) throw new Error('No seats');
        setSeats(seatList);
        setShowtimeInfo({
          showtimeId: Number(showtimeId),
          movieTitle: data.movieTitle ?? data.data?.movieTitle ?? null,
          cinemaName: data.cinemaName ?? null,
          roomName:   data.roomName   ?? null,
          showDate:   data.showDate   ?? null,
          showTime:   data.showTime   ?? null,
        });
        setUsingMock(false);
      } catch {
        try {
          const data = await axiosClient.get<SeatMapResponse>(`/showtime-seats/${showtimeId}`) as unknown as SeatMapResponse;
          const seatList: SeatDto[] = data.seats ?? data.data?.seats ?? [];
          if (seatList.length === 0) throw new Error('Empty');
          setSeats(seatList);
          setUsingMock(false);
        } catch {
          setSeats(generateMockSeats(showtimeId));
          setUsingMock(true);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, searchParams]);

  const handleSeatClick = (seatId: string) => {
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id !== seatId) return s;
        const cur = (s as SeatDto2).status;
        if (cur === 'BOOKED') return s;
        if (cur === 'HELD') {
          const selected = prev.filter((x) => (x as SeatDto2).status === 'HELD');
          if (selected.length <= 1) return { ...s, status: 'AVAILABLE' as SeatStatus };
          return { ...s, status: 'AVAILABLE' as SeatStatus };
        }
        const held = prev.filter((x) => (x as SeatDto2).status === 'HELD');
        if (held.length >= MAX_SEATS) return s;
        return { ...s, status: 'HELD' as SeatStatus };
      })
    );
  };

  const handleHoldSeats = async () => {
    const selected = getSelectedSeats(seats);
    if (selected.length === 0) {
      setHoldError('Vui lòng chọn ít nhất 1 ghế.');
      return;
    }
    setHolding(true);
    setHoldError(null);
    try {
      const showtimeId = searchParams.get('showtimeId') ?? id ?? '';
      const showtimeSeatIds = selected.map((s) => Number(s.id));
      const res = await axiosClient.post('/showtime-seats/hold-many', {
        showtimeSeatIds,
        showtimeId: Number(showtimeId),
        holdMinutes: Math.ceil(HOLD_SECONDS / 60),
      }) as Record<string, unknown>;
      const ids = (res.holdIds ?? res.data) as number[] | undefined;
      if (ids && ids.length > 0) {
        setHeldIds(ids);
        startCountdown();
      } else {
        setHeldIds(showtimeSeatIds);
        startCountdown();
      }
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
      const bookingId = res.bookingId ?? (res.data as Record<string, unknown> | undefined)?.bookingId ?? res.id;
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

  const selectedSeats = getSelectedSeats(seats);

  // FIX TS2322: Seat interface yêu cầu status — thêm status vào map
  const selectedSeatsForBar: Seat[] = selectedSeats.map((s) => ({
    seatId:   s.id,
    seatCode: `${s.rowName}${s.seatNumber}`,
    price:    s.price ?? 90_000,
    status:   s.status as Seat['status'],   // map SeatStatus -> Seat['status']
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
      {/* Backdrop */}
      {movie?.backdrop_url && (
        <div
          className="absolute inset-0 h-64 bg-cover bg-center opacity-20 pointer-events-none"
          style={{ backgroundImage: `url('${movie.backdrop_url}')` }}
        />
      )}

      <div className="relative max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {movie?.poster_url && (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-20 h-28 object-cover rounded-xl shadow-lg flex-shrink-0"
            />
          )}
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

        {/* Trailer */}
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

        {/* Seat Map */}
        <div className={`rounded-2xl p-4 ${card}`}>
          <SeatMap seats={seats} onSeatClick={handleSeatClick} />
        </div>

        {/* Hold error */}
        {holdError && (
          <div className="rounded-xl px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{holdError}</div>
        )}

        {/* Countdown */}
        {heldIds.length > 0 && holdCountdown > 0 && (
          <div className="text-center text-sm font-mono font-bold text-yellow-500">
            ⏳ Thời gian giữ ghế còn lại: {countdownStr}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { void handleHoldSeats(); }}
            disabled={holding || selectedSeats.length === 0}
            className="flex-1 py-3 rounded-2xl font-semibold transition bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black"
          >
            {holding ? 'Đang giữ...' : `Giữ ${selectedSeats.length} ghế`}
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

        {/* Selected seats bar */}
        {selectedSeatsForBar.length > 0 && (
          <SelectedSeatsBar seats={selectedSeatsForBar} total={totalAmount} />
        )}
      </div>
    </div>
  );
}
