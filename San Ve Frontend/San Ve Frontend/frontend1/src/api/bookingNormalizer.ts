
export interface BookingCore {
  id: string;
  orderCode?: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  seatCodes: string[];
  totalAmount: number;
  status: string;
  expiresAt?: string;
  paidAt?: string;
}

type Raw = Record<string, unknown>;

const asObj = (v: unknown): Raw | undefined =>
  v && typeof v === 'object' ? (v as Raw) : undefined;

export function extractSeatCodes(raw: Raw): string[] {
  const details = (raw.bookingDetails ?? raw.booking_details ?? []) as Raw[];
  if (!Array.isArray(details)) return [];

  return details
    .map((d) => {
      const seat = asObj(asObj(d.showtimeSeat ?? d.showtime_seat)?.seat);
      if (!seat) return '';
      const row = (seat.seatRow ?? seat.rowName ?? seat.seat_row ?? '') as string;
      const num = (seat.seatNumber ?? seat.seat_number ?? '') as string | number;
      return `${row}${num}`;
    })
    .filter(Boolean);
}

export interface NormalizeOptions {
  strictNumericId?: boolean;
}

export function normalizeBookingCore(
  raw: Raw,
  options: NormalizeOptions = {},
): BookingCore {
  const showtime = asObj(raw.showtime);
  const movie = asObj(raw.movie ?? showtime?.movie);
  const room = asObj(showtime?.room ?? raw.room);
  const cinema = asObj(room?.cinema ?? raw.cinema);

  const startRaw = (showtime?.startTime ?? showtime?.start_time) as string | undefined;
  const start = startRaw ? new Date(startRaw) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;

  const id = String(raw.bookingId ?? raw.booking_id ?? raw.id ?? '').trim();
  if (options.strictNumericId && id && !/^\d+$/.test(id)) {
    throw new Error(
      'Dữ liệu đơn hàng không hợp lệ: máy chủ không trả về bookingId dạng số',
    );
  }

  const expiresAtRaw = raw.expiresAt ?? raw.expires_at;
  const paidAtRaw = raw.paidAt ?? raw.paid_at;

  return {
    id,
    orderCode: (raw.orderCode ?? raw.bookingCode ?? raw.booking_code) as
      | string
      | undefined,
    movieTitle: (raw.movieTitle ?? movie?.title ?? 'Vé xem phim') as string,
    cinemaName: (raw.cinemaName ?? cinema?.cinemaName ?? cinema?.name) as
      | string
      | undefined,
    roomName: (raw.roomName ?? room?.roomName ?? room?.name) as string | undefined,
    showDate: ((raw.showDate as string | undefined) ??
      validStart?.toLocaleDateString('vi-VN')) as string | undefined,
    showTime: ((raw.showTime as string | undefined) ??
      validStart?.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })) as string | undefined,
    seatCodes: extractSeatCodes(raw),
    totalAmount: Number(raw.totalAmount ?? raw.total_amount ?? raw.amount ?? 0),
    status: (raw.status ?? 'PENDING_PAYMENT') as string,
    expiresAt: typeof expiresAtRaw === 'string' ? expiresAtRaw : undefined,
    paidAt: typeof paidAtRaw === 'string' ? paidAtRaw : undefined,
  };
}
