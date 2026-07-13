// src/pages/SeatBookingPage.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeatMap from "../components/seat/SeatMap";
import SelectedSeatsBar from "../components/SelectedSeatsBar";
import { useTheme } from "../context/ThemeContext";
import type { SeatDto } from "../types/seat.types";
import axiosClient from "../api/axiosClient";

const FALLBACK_POSTER   = "https://picsum.photos/seed/fallbackposter/500/750";
const FALLBACK_BACKDROP = "https://picsum.photos/seed/fallbackbackdrop/1600/900";

const MAX_SEATS    = 8;
const HOLD_SECONDS = 300;

interface BookingSeat {
  id: string;
  row: string;
  number: number;
  type: string;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  seatId: string;
  seatCode: string;
}

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

// FIX: regex cũ bị lỗi cú pháp: [.[\\w-]{11} → sửa thành [\\w-]{11}
function getYoutubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
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

interface HoldResponse {
  holdIds?: number[];
}

interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string;
}

export default function SeatBookingPage() {
  // FIX: dùng useParams chung — hỗ trợ cả route /movies/:id/seats và /booking/:id
  const params = useParams<{ id?: string; movieId?: string }>();
  const movieId = params.id ?? params.movieId;

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
  // FIX #51: thêm state thông báo hết hạn giữ ghế
  const [holdExpired, setHoldExpired] = useState(false);
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
    // FIX #51: reset trạng thái expired khi bắt đầu countdown mới
    setHoldExpired(false);
    timerRef.current = setInterval(() => {
      setHoldCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // FIX #51: khi hết hạn — xóa hold, reset selectedIds, báo cho user
          setHeldIds([]);
          setSelectedIds(new Set());
          setHoldExpired(true);
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
    const id = setTimeout(() => {
      movieSetRef.current = false;
      setSelectedIds(new Set());
      setHeldIds([]);
      setHoldCountdown(HOLD_SECONDS);
      setHoldExpired(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 0);

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
        const data = await axiosClient.get<SeatMapResponse>(`/showtime-seats/${showtimeId}`) as unknown as SeatMapResponse;

        const seatList: SeatDto[] = data.seats ?? [];

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
              movie_id: Number(m.movie_id ?? movieId),
              title: String(m.title ?? movieTitle ?? ''),
              poster_url: String(m.poster_url ?? FALLBACK_POSTER),
              backdrop_url: String(m.backdrop_url ?? FALLBACK_BACKDROP),
              trailer_url: m.trailer_url as string | undefined,
              age_rating: m.age_rating as string | undefined,
              duration_minutes: Number(m.duration_minutes ?? 0),
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

  const handleSeatToggle = (seatId: string) => {
    setSelectedIds((prev) => {
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

  const handleHoldSeats = async (): Promise<number[] | null> => {
    const showtimeId = searchParams.get('showtimeId');
    if (!showtimeId || selectedIds.size === 0) return null;

    setHolding(true);
    setHoldError(null);
    try {
      const showtimeSeatIds = seats
        .filter((s) => selectedIds.has(s.id))
        .map((s) => Number(s.id));

      const res = await axiosClient.post('/showtime-seats/hold-many', {
        showtimeId: Number(showtimeId),
        showtimeSeatIds,
      }) as unknown as HoldResponse;

      const ids = res.holdIds ?? [];
      setHeldIds(ids);
      startCountdown();
      return ids;
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Không thể giữ ghế';
      setHoldError(msg);
      return null;
    } finally {
      setHolding(false);
    }
  };

  const handleProceed = async () => {
    if (selectedIds.size === 0) return;
    setNavigating(true);
    setNavError('');

    const showtimeId = searchParams.get('showtimeId');

    // Local/mock mode: không có showtimeId thật
    if (!showtimeId || usingMock) {
      const selectedSeatObjects = seats.filter((s) => selectedIds.has(s.id));
      const totalAmount = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);
      const seatCodes = selectedSeatObjects.map((s) => `${s.rowName}${s.seatNumber}`);
      const params = new URLSearchParams({
        seats: seatCodes.join(','),
        total: String(totalAmount),
        movieTitle: movie?.title ?? showtimeInfo?.movieTitle ?? 'Vé xem phim',
        ...(showtimeInfo?.cinemaName ? { cinema: showtimeInfo.cinemaName } : {}),
        ...(showtimeInfo?.roomName   ? { room:   showtimeInfo.roomName }   : {}),
        ...(showtimeInfo?.showDate   ? { date:   showtimeInfo.showDate }   : {}),
        ...(showtimeInfo?.showTime   ? { time:   showtimeInfo.showTime }   : {}),
      });
      navigate(`/payment/local?${params.toString()}`);
      setNavigating(false);
      return;
    }

    try {
      // Bước 1: Hold ghế
      let holdIds = heldIds;
      if (!holdIds.length) {
        const newHoldIds = await handleHoldSeats();
        if (!newHoldIds || !newHoldIds.length) {
          setNavError('Không thể giữ ghế. Vui lòng thử lại.');
          setNavigating(false);
          return;
        }
        holdIds = newHoldIds;
      }

      // Bước 2: Tạo booking
      const bookingData = await axiosClient.post('/bookings', {
        holdIds,
        showtimeId: Number(showtimeId),
      }) as unknown as CreateBookingResponse;

      if (!bookingData?.bookingId) {
        setNavError('Không tạo được đơn hàng. Vui lòng thử lại.');
        setNavigating(false);
        return;
      }

      // Bước 3: Navigate sang trang thanh toán với bookingId thật
      navigate(`/payment/${bookingData.bookingId}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      setNavError(msg);
    } finally {
      setNavigating(false);
    }
  };

  const embedUrl = getYoutubeEmbedUrl(movie?.trailer_url);

  const bg     = darkMode ? 'bg-gray-950 text-white'        : 'bg-gray-50 text-gray-900';
  const card   = darkMode ? 'bg-gray-900 border-gray-800'   : 'bg-white border-gray-200';

  // FIX #51: tính totalPrice và danh sách ghế đã chọn để truyền đúng vào SelectedSeatsBar
  const selectedSeatObjects = seats.filter((s) => selectedIds.has(s.id));
  const totalPrice = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);

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
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img
            src={movie.backdrop_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Movie info */}
        {(movie || showtimeInfo) && (
          <div className={`rounded-2xl border p-5 flex gap-4 ${card}`}>
            {movie?.poster_url && (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-20 h-28 object-cover rounded-xl flex-shrink-0"
              />
            )}
            <div className="space-y-1">
              <h1 className="text-xl font-bold">{movie?.title ?? showtimeInfo?.movieTitle ?? ''}</h1>
              {movie?.age_rating && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500 text-white">{movie.age_rating}</span>
              )}
              {showtimeInfo?.cinemaName && <p className="text-sm opacity-70">🎬 {showtimeInfo.cinemaName}</p>}
              {showtimeInfo?.roomName   && <p className="text-sm opacity-70">🚪 {showtimeInfo.roomName}</p>}
              {showtimeInfo?.showDate   && <p className="text-sm opacity-70">📅 {showtimeInfo.showDate}</p>}
              {showtimeInfo?.showTime   && <p className="text-sm opacity-70">⏰ {showtimeInfo.showTime}</p>}
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
          <div className="rounded-xl px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 text-sm">
            ⚠️ Đang dùng dữ liệu ghế mẫu. Kết quả đặt vé sẽ không được lưu.
          </div>
        )}

        {/* Seat Map */}
        {error && !usingMock && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <SeatMap
          seats={seats}
          selectedIds={selectedIds}
          onSeatToggle={handleSeatToggle}
          maxSeats={MAX_SEATS}
        />

        {/* Hold countdown — inline trong page */}
        {heldIds.length > 0 && (
          <div className={`text-center text-sm font-mono font-bold ${
            holdCountdown < 60 ? 'text-red-500' : 'text-yellow-500'
          }`}>
            ⏳ Ghế đang được giữ: {String(Math.floor(holdCountdown / 60)).padStart(2,'0')}:{String(holdCountdown % 60).padStart(2,'0')}
          </div>
        )}

        {/* FIX #51: banner thông báo rõ ràng khi giữ ghế hết hạn */}
        {holdExpired && (
          <div className="rounded-xl px-4 py-3 bg-orange-500/10 border border-orange-500/30 text-orange-500 text-sm font-medium">
            ⌛ Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế và tiến hành đặt vé.
          </div>
        )}

        {holdError && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {holdError}
          </div>
        )}

        {navError && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {navError}
          </div>
        )}

        {/* FIX #51: truyền đúng totalPrice, selectedSeatObjects và holdCountdown vào SelectedSeatsBar */}
        <SelectedSeatsBar
          seats={selectedSeatObjects}
          totalPrice={totalPrice}
          holdCountdown={heldIds.length > 0 ? holdCountdown : null}
          onProceed={handleProceed}
          holding={holding}
          navigating={navigating}
        />
      </div>
    </div>
  );
}
