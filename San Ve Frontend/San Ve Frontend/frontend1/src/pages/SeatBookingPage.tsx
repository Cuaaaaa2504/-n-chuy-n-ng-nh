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

function getYoutubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([.[\w-]{11})/);
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

  useEffect(() => {
    const id = setTimeout(() => {
      movieSetRef.current = false;
      setSelectedIds(new Set());
      setHeldIds([]);
      setHoldCountdown(HOLD_SECONDS);
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
        // axiosClient interceptor đã unwrap response.data — dùng trực tiếp
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
        } else if (movieTitle && !movieSetRef.current) {
          movieSetRef.current = true;
          setMovie({ movie_id: Number(showtimeId), title: movieTitle, poster_url: FALLBACK_POSTER, backdrop_url: FALLBACK_BACKDROP });
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
          setMovie({ movie_id: Number(movieId ?? 0), title: searchParams.get('title') ?? 'Chọn ghế', poster_url: FALLBACK_POSTER, backdrop_url: FALLBACK_BACKDROP });
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => clearTimeout(id);
  }, [movieId, searchParams]);

  const handleSeatClick = (seatId: string) => {
    setSelectedIds((prev) => {
      const seat = seats.find((s) => String(s.id) === seatId);
      if (!seat) return prev;
      const blockedStatuses: string[] = ['BOOKED', 'HELD', 'SOLD', 'BLOCKED'];
      if (blockedStatuses.includes(seat.status)) return prev;
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
    if (selectedIds.size === 0) return;
    const showtimeId = searchParams.get('showtimeId');
    if (!showtimeId) {
      startCountdown();
      setHeldIds(Array.from(selectedIds).map(Number));
      return;
    }
    setHolding(true);
    setHoldError(null);
    try {
      // FIX: endpoint đúng là /showtime-seats/hold-many (theo ShowtimeSeatsController)
      const holdData = await axiosClient.post(`/showtime-seats/hold-many`, {
        showtimeId: Number(showtimeId),
        seatIds: Array.from(selectedIds).map(Number),
      }) as unknown as HoldResponse;
      const ids: number[] = Array.isArray(holdData?.holdIds)
        ? holdData.holdIds!
        : Array.from(selectedIds).map(Number);
      setHeldIds(ids);
      startCountdown();
    } catch {
      startCountdown();
      setHeldIds(Array.from(selectedIds).map(Number));
      setHoldError('Không thể giữ ghế qua server. Tiếp tục đặt vé mẫu.');
    } finally {
      setHolding(false);
    }
  };

  const handleProceed = async () => {
    if (selectedIds.size === 0) return;
    setNavigating(true);
    setNavError('');
    try {
      const showtimeId = searchParams.get('showtimeId');

      // FIX: Tạo booking trước, lấy bookingId rồi mới navigate
      if (showtimeId && heldIds.length > 0) {
        const bookingData = await axiosClient.post(`/bookings`, {
          holdIds: heldIds,
        }) as unknown as CreateBookingResponse;
        navigate(`/payment/${bookingData.bookingId}`);
        return;
      }

      // Mock mode — không có hold thật, navigate local
      const selectedSeats: BookingSeat[] = Array.from(selectedIds).map((sid) => {
        const s = seats.find((seat) => String(seat.id) === sid);
        return {
          id: sid, row: s?.rowName ?? sid[0], number: s?.seatNumber ?? parseInt(sid.slice(1)),
          type: s?.type ?? 'STANDARD', price: s?.price ?? 90_000,
          status: (s?.status ?? 'AVAILABLE') as BookingSeat['status'],
          seatId: sid, seatCode: `${s?.rowName ?? sid[0]}${s?.seatNumber ?? sid.slice(1)}`,
        };
      });
      const total = selectedSeats.reduce((sum, s) => sum + s.price, 0);
      const params = new URLSearchParams({
        movieTitle: movie?.title ?? '',
        cinema: showtimeInfo?.cinemaName ?? searchParams.get('cinema') ?? '',
        room:   showtimeInfo?.roomName   ?? searchParams.get('room')   ?? '',
        date:   showtimeInfo?.showDate   ?? searchParams.get('date')   ?? '',
        time:   showtimeInfo?.showTime   ?? searchParams.get('time')   ?? '',
        seats:  selectedSeats.map(s => s.seatCode).join(','),
        total:  String(total),
      });
      navigate(`/payment/local?${params.toString()}`);
    } catch {
      setNavError('Có lỗi xảy ra khi tạo đơn đặt vé. Vui lòng thử lại.');
    } finally {
      setNavigating(false);
    }
  };

  const selectedSeatsData: BookingSeat[] = Array.from(selectedIds).map((sid) => {
    const s = seats.find((seat) => String(seat.id) === sid);
    return {
      id: sid, row: s?.rowName ?? sid[0], number: s?.seatNumber ?? parseInt(sid.slice(1)),
      type: s?.type ?? 'STANDARD', price: s?.price ?? 90_000,
      status: (s?.status ?? 'AVAILABLE') as BookingSeat['status'],
      seatId: sid, seatCode: `${s?.rowName ?? sid[0]}${s?.seatNumber ?? sid.slice(1)}`,
    };
  });

  const totalPrice = selectedSeatsData.reduce((sum, s) => sum + s.price, 0);
  const embedUrl   = getYoutubeEmbedUrl(movie?.trailer_url);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bg   = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg} pb-40`}>
      {movie?.backdrop_url && (
        <div className="relative w-full h-48 md:h-64 overflow-hidden">
          <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950" />
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {movie && (
          <div className="flex gap-4 items-start">
            <img src={movie.poster_url ?? FALLBACK_POSTER} alt={movie.title} className="w-20 md:w-28 rounded-xl shadow-lg flex-shrink-0" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{movie.title}</h1>
              {movie.age_rating && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-red-600 text-white font-semibold">{movie.age_rating}</span>
              )}
              {movie.duration_minutes ? (
                <p className={`text-sm mt-1 ${muted}`}>{movie.duration_minutes} phút</p>
              ) : null}
            </div>
          </div>
        )}
        {showtimeInfo && (
          <div className={`rounded-xl px-4 py-3 flex flex-wrap gap-3 text-sm ${card}`}>
            {showtimeInfo.cinemaName && <span>🏢 {showtimeInfo.cinemaName}</span>}
            {showtimeInfo.roomName   && <span>🚪 {showtimeInfo.roomName}</span>}
            {showtimeInfo.showDate   && <span>📅 {showtimeInfo.showDate}</span>}
            {showtimeInfo.showTime   && <span>🕐 {showtimeInfo.showTime}</span>}
          </div>
        )}
        {error && <div className="rounded-xl px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">⚠️ {error}</div>}
        {usingMock && <div className="rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">ℹ️ Đang hiển thị sơ đồ ghế mẫu.</div>}
        {holdError && <div className="rounded-xl px-4 py-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">⚠️ {holdError}</div>}
        {navError  && <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">❌ {navError}</div>}
        <div className={`rounded-2xl p-4 md:p-6 ${card}`}>
          <h2 className="text-base font-semibold mb-4">Chọn ghế (tối đa {MAX_SEATS})</h2>
          <SeatMap
            seats={seats.map(s => ({ ...s, id: String(s.id) }))}
            selectedIds={selectedIds}
            onSeatClick={handleSeatClick}
            heldIds={new Set(heldIds.map(String))}
          />
        </div>
        {embedUrl && (
          <div className={`rounded-2xl overflow-hidden ${card}`}>
            <p className="px-4 pt-4 text-sm font-semibold">🎬 Trailer</p>
            <div className="aspect-video mt-2">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Trailer" />
            </div>
          </div>
        )}
      </div>
      <SelectedSeatsBar
        seats={selectedSeatsData} totalPrice={totalPrice}
        holdCountdown={heldIds.length > 0 ? holdCountdown : null}
        onHold={handleHoldSeats} onProceed={handleProceed}
        holding={holding} navigating={navigating}
      />
    </div>
  );
}
