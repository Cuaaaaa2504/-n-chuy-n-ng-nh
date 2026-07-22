// src/api/showtimeApi.ts
import axiosClient from './axiosClient';
import type {
  MovieOption,
  RoomOption,
  Showtime,
  ShowtimeFormData,
  ShowtimePayload,
} from '../types/showtime';

/* ────────────────────────────────────────────────────────────────────────────
 * Helper chuyển đổi ngày/giờ
 * ──────────────────────────────────────────────────────────────────────────*/

/** '2026-07-10' + '19:30' -> ISO string để gửi lên backend (IsDateString) */
export function toIsoDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  // Dùng giờ địa phương — đúng với ý định của admin khi nhập lịch chiếu
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, m ?? 0, 0).toISOString();
}

/** ISO datetime -> 'YYYY-MM-DD' theo giờ địa phương */
export function toLocalDate(iso: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** ISO datetime -> 'HH:mm' theo giờ địa phương */
export function toLocalTime(iso: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Normalize
 * ──────────────────────────────────────────────────────────────────────────*/

function normalizeShowtime(item: Record<string, unknown>): Showtime {
  // Backend trả cấu trúc lồng nhau: showtime -> room -> cinema
  // (relations: ['room', 'room.cinema']). Property theo entity là
  // room.roomName và room.cinema.cinemaName, KHÔNG phải .name.
  const room = item.room as Record<string, unknown> | undefined;
  const cinema = (room?.cinema ?? item.cinema) as Record<string, unknown> | undefined;
  const movie = item.movie as Record<string, unknown> | undefined;

  const startTime = String(item.startTime ?? item.start_time ?? '');
  const endTime = String(item.endTime ?? item.end_time ?? '');

  return {
    id: Number(item.showtimeId ?? item.showtime_id ?? item.id ?? 0),
    movieId: Number(item.movieId ?? item.movie_id ?? movie?.movieId ?? movie?.id ?? 0),
    roomId: Number(item.roomId ?? item.room_id ?? room?.roomId ?? room?.id ?? 0),
    cinemaId:
      Number(
        item.cinemaId ?? item.cinema_id ??
        cinema?.cinemaId ?? cinema?.id ?? cinema?.cinema_id ??
        room?.cinemaId ?? room?.cinema_id ?? 0,
      ) || undefined,

    // FIX BUG-04: movieTitle lấy từ relation nếu có; nếu backend chưa join
    // `movie` thì hook sẽ điền nốt bằng danh sách phim thật (không hardcode).
    movieTitle: (item.movieTitle ?? movie?.title ?? '') as string,
    cinemaName: (item.cinemaName ?? cinema?.cinemaName ?? cinema?.name ?? '') as string,
    roomName: (item.roomName ?? room?.roomName ?? room?.name ?? '') as string,

    startTime,
    endTime,
    showDate: toLocalDate(startTime),
    basePrice: Number(item.basePrice ?? item.base_price ?? 0),
    status: (item.status ?? 'OPEN') as Showtime['status'],
  };
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const obj = payload as Record<string, unknown> | null;
  const raw = (obj?.data ?? obj?.items ?? []) as unknown;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

/** FIX: ShowtimeFormData (ngày + giờ rời) -> payload đúng CreateShowtimeDto */
export function toPayload(data: ShowtimeFormData): ShowtimePayload {
  return {
    movieId: Number(data.movieId),
    roomId: Number(data.roomId),
    startTime: toIsoDateTime(data.showDate, data.startTime),
    endTime: toIsoDateTime(data.showDate, data.endTime),
    basePrice: Number(data.basePrice),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * CRUD suất chiếu
 * ──────────────────────────────────────────────────────────────────────────*/

/** GET /showtimes — lấy toàn bộ suất chiếu (admin) */
export async function getAllShowtimes(): Promise<Showtime[]> {
  const payload = (await axiosClient.get('/showtimes')) as unknown;
  return unwrapList(payload).map(normalizeShowtime);
}

/** GET /showtimes/movie/:movieId — suất chiếu theo phim (trang người dùng) */
export async function getShowtimesByMovie(movieId: number): Promise<Showtime[]> {
  const payload = (await axiosClient.get(`/showtimes/movie/${movieId}`)) as unknown;
  return unwrapList(payload).map(normalizeShowtime);
}

/**
 * POST /showtimes/admin
 * FIX: trước đây gọi POST /showtimes -> 404 vì route admin nằm ở /showtimes/admin.
 */
export async function createShowtime(data: ShowtimeFormData): Promise<Showtime> {
  const res = (await axiosClient.post('/showtimes/admin', toPayload(data))) as unknown;
  const item = (res as Record<string, unknown>)?.data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

/**
 * PATCH /showtimes/admin/:id
 * FIX: trước đây gọi PUT /showtimes/:id -> 404/405. Backend dùng PATCH + prefix admin.
 */
export async function updateShowtime(id: number, data: ShowtimeFormData): Promise<Showtime> {
  const res = (await axiosClient.patch(`/showtimes/admin/${id}`, toPayload(data))) as unknown;
  const item = (res as Record<string, unknown>)?.data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

/**
 * DELETE /showtimes/admin/:id — backend soft-delete: set status = 'CANCELLED'.
 * FIX: trước đây gọi PATCH /showtimes/:id/cancel — endpoint này không tồn tại.
 */
export async function cancelShowtime(id: number): Promise<void> {
  await axiosClient.delete(`/showtimes/admin/${id}`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dữ liệu cho các <select> của form (thay cho MOVIE_ID_MAP / ROOM_ID_MAP cứng)
 * ──────────────────────────────────────────────────────────────────────────*/

/**
 * GET /movies — lấy danh sách phim thật để đổ vào dropdown.
 *
 * FIX Lỗi 1 (nguyên nhân thứ 2): `MovieQueryDto` giới hạn `@Max(50)` cho `limit`,
 * và backend bật `forbidNonWhitelisted` -> gửi `limit: 500` bị trả về
 * 400 Bad Request. Vì `getMovieOptions()` có `.catch(() => [])` nên lỗi bị nuốt
 * im lặng và dropdown vẫn trống KỂ CẢ khi port đã đúng. Nay phân trang 50/lần.
 */
export async function getMovieOptions(): Promise<MovieOption[]> {
  const LIMIT = 50;
  const MAX_PAGES = 20; // chặn trên an toàn: tối đa 1000 phim
  const out: MovieOption[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = (await axiosClient.get('/movies', {
      params: { page, limit: LIMIT },
    })) as unknown;

    const rows = unwrapList(payload);
    out.push(
      ...rows.map((m) => ({
        id: Number(m.movieId ?? m.movie_id ?? m.id ?? 0),
        title: String(m.title ?? ''),
      })),
    );

    const total = Number((payload as Record<string, unknown>)?.total ?? 0);
    if (rows.length < LIMIT || (total > 0 && out.length >= total)) break;
  }

  return out;
}

/** GET /cinemas + GET /cinemas/:id/rooms/all — lấy phòng chiếu thật của từng rạp */
export async function getRoomOptions(): Promise<RoomOption[]> {
  const cinemasPayload = (await axiosClient.get('/cinemas')) as unknown;
  const cinemas = unwrapList(cinemasPayload);

  const perCinema = await Promise.all(
    cinemas.map(async (c) => {
      const cinemaId = Number(c.cinemaId ?? c.cinema_id ?? c.id ?? 0);
      const cinemaName = String(c.cinemaName ?? c.cinema_name ?? c.name ?? '');
      try {
        const roomsPayload = (await axiosClient.get(
          `/cinemas/${cinemaId}/rooms/all`,
        )) as unknown;
        return unwrapList(roomsPayload).map<RoomOption>((r) => ({
          id: Number(r.roomId ?? r.room_id ?? r.id ?? 0),
          name: String(r.roomName ?? r.room_name ?? r.name ?? ''),
          cinemaId,
          cinemaName,
        }));
      } catch {
        // Một rạp lỗi không được làm hỏng cả dropdown
        return [] as RoomOption[];
      }
    }),
  );

  return perCinema.flat();
}
