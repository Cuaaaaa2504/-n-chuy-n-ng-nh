// src/pages/SeatBookingPage.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import type { Seat } from "../hooks/useSeatHold";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";
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
        id:         `${row}${col}`,
        rowName:    row,
        seatNumber: col,
        type:       t,
        // FIX #7: dùng 'AVAILABLE' thay vì trộn với 'HELD' — ghế đang chọn trên UI
        // sẽ dùng trạng thái 'SELECTED' riêng biệt thông qua selectedIds
        status:     'AVAILABLE',
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

// FIX #9: gộp lại 1 interface duy nhất, bỏ SeatDto2 trùng lặp
type SeatStatus = 'AVAILABLE' | 'SELECTED' | 'HELD' | 'BOOKED';

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

export default function SeatBookingPage() {
  // FIX #2/#10: đổi tên param rõ ràng hơn — `:id` trong route thực chất là movieId
  const { id: movieId }             = useParams<{ id: string }>();
  const [searchParams]              = useSearchParams();
  const { darkMode }                = useTheme();

  const [movie, setMovie]           = useState<MovieInfo | null>(null);
  const [seats, setSeats]           = useState<SeatDto[]>([]);
  // FIX #7: track ghế đang chọn bằng Set riêng biệt, không trộn với status server
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
  // FIX #1: dùng ref để tránh stale closure khi kiểm tra movie đã được set chưa
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

  useEffect(() => {
    // Reset khi movieId thay đổi
    movieSetRef.current = false;
    setSelectedIds(new Set());
    setHeldIds([]);
    setHoldCountdown(HOLD_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);

    const load = async () => {
      setLoading(true);
      setError(null);
      // FIX #2: showtimeId luôn lấy từ query param, movieId từ :id
      const showtimeId = searchParams.get('showtimeId');

      // FIX #1: Luôn hiển thị thông tin từ query params trước (date, cinema, time, room)
      // kể cả khi API chưa trả về — tránh trang trắng
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

      // Set showtimeInfo ngay từ query params để UI không trắng khi API chậm
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
        const data: SeatMapResponse = (raw as any)?.data ?? raw as unknown as SeatMapResponse;

        const seatList: SeatDto[] =
          data.seats ??
          data.data?.seats ??
          [];

        const movieTitle = data.movieTitle ?? data.data?.movieTitle ?? null;
        const cinemaName = data.cinemaName ?? data.data?.cinemaName ?? qCinema ?? null;
        const roomName   = data.roomName   ?? data.data?.roomName   ?? qRoom   ?? null;
        const showDate   = data.showDate   ?? data.data?.showDate   ?? qDate   ?? null;
        const showTime   = data.showTime   ?? data.data?.showTime   ?? qTime   ?? null;

        // Cập nhật showtimeInfo với dữ liệu đầy đủ từ API
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

        // FIX #1: chỉ fetch movie nếu chưa set (dùng ref, tránh stale closure)
        if (movieId && !movieSetRef.current) {
          try {
            const mRaw = await axiosClient.get(`/movies/${movieId}`);
            const m = (mRaw as any)?.data ?? mRaw;
            movieSetRef.current = true;
            setMovie({
              movie_id: Number((m as any).movie_id ?? movieId),
              title: String((m as any).title ?? movieTitle ?? ''),
              poster_url: (m as any).poster_url ?? FALLBACK_POSTER,
              backdrop_url: (m as any).backdrop_url ?? FALLBACK_BACKDROP,
              trailer_url: (m as any).trailer_url,
              age_rating: (m as any).age_rating,
              duration_minutes: (m as any).duration_minutes,
            });
          } catch {
            // fallback: tạo MovieInfo tối giản từ dữ liệu sẵn có
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
        const status = (err as any)?.response?.status;
        if (status === 401) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError('Không thể tải sơ đồ ghế. Đang dùng dữ liệu mẫu.');
        }
        setSeats(generateMockSeats(showtimeId));
        setUsingMock(true);
        // FIX #1: Đảm bảo movie không null kể cả khi API lỗi
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

  // FIX #7: handleSeatClick dùng selectedIds thay vì thay đổi status của seat
  const handleSeatClick = (seatId: string) => {
    setSeats((prevSeats) => {
      const seat = prevSeats.find((s) => s.id === seatId);
      if (!seat) return prevSeats;
      // Không cho chọn ghế đã BOOKED hoặc HELD bởi người khác
      if (seat.status === 'BOOKED' || seat.status === 'HELD') return prevSeats;
      return prevSeats;
    });
    setSelectedIds((prev) => {
      const seat = seats.find((s) => s.id === seatId);
      if (!seat) return prev;
      if (seat.status === 'BOOKED' || seat.status === 'HELD') return prev;
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
      }) as Record<string, unknown>;
      const ids = (res.holdIds ?? (res.data as any)?.holdIds ?? res.data) as number[] | undefined;
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
        (res as any).bookingId ??
        (res.data as Record<string, unknown> | undefined)?.bookingId ??
        (res as any).id ??
        (res.data as any)?.id;
      // FIX #5: kiểm tra bookingId hợp lệ trước khi navigate
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

  // FIX #7: tính selectedSeats từ selectedIds thay vì filter status === 'HELD'
  const selectedSeats = seats.filter((s) => selectedIds.has(s.id));

  const selectedSeatsForBar: Seat[] = selectedSeats.map((s) => ({
    seatId:   s.id,
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

        {/* Seat Map — truyền thêm selectedIds để SeatMap highlight ghế đang chọn */}
        <div className={`rounded-2xl p-4 ${card}`}>
          <SeatMap
            seats={seats}
            onSeatClick={handleSeatClick}
            selectedIds={selectedIds}
          />
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

        {/* Selected seats bar */}
        {selectedSeatsForBar.length > 0 && (
          <SelectedSeatsBar seats={selectedSeatsForBar} total={totalAmount} />
        )}
      </div>
    </div>
  );
}
