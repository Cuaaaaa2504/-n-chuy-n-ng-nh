import axiosClient from './axiosClient';
import type {
  MovieOption,
  RoomOption,
  Showtime,
  ShowtimeFormData,
  ShowtimePayload,
} from '../types/showtime';

/* Helper chuyển đổi ngày/giờ */

export function toIsoDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, m ?? 0, 0).toISOString();
}

export function toLocalDate(iso: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function toLocalTime(iso: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}


function normalizeShowtime(item: Record<string, unknown>): Showtime {
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

    movieTitle: (item.movieTitle ?? movie?.title ?? '') as string,
    cinemaName: (item.cinemaName ?? cinema?.cinemaName ?? cinema?.name ?? '') as string,
    roomName: (item.roomName ?? room?.roomName ?? room?.name ?? '') as string,

    startTime,
    endTime,
    showDate: toLocalDate(startTime),
    basePrice: Number(item.basePrice ?? item.base_price ?? 0),
    status: (item.status ?? 'OPEN') as Showtime['status'],
    updatedAt: (item.updatedAt ?? item.updated_at) as string | undefined,
  };
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const obj = payload as Record<string, unknown> | null;
  const raw = (obj?.data ?? obj?.items ?? []) as unknown;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

export function toPayload(data: ShowtimeFormData): ShowtimePayload {
  return {
    movieId: Number(data.movieId),
    roomId: Number(data.roomId),
    startTime: toIsoDateTime(data.showDate, data.startTime),
    endTime: toIsoDateTime(data.showDate, data.endTime),
    basePrice: Number(data.basePrice),
  };
}


export async function getAllShowtimes(): Promise<Showtime[]> {
  const payload = (await axiosClient.get('/showtimes')) as unknown;
  return unwrapList(payload).map(normalizeShowtime);
}

export async function getShowtimesByMovie(movieId: number): Promise<Showtime[]> {
  const payload = (await axiosClient.get(`/showtimes/movie/${movieId}`)) as unknown;
  return unwrapList(payload).map(normalizeShowtime);
}

export async function createShowtime(data: ShowtimeFormData): Promise<Showtime> {
  const res = (await axiosClient.post('/showtimes/admin', toPayload(data))) as unknown;
  const item = (res as Record<string, unknown>)?.data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

export async function updateShowtime(
  id: number,
  data: ShowtimeFormData,
  expectedUpdatedAt?: string,
): Promise<Showtime> {
  const payload = { ...toPayload(data), ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) };
  const res = (await axiosClient.patch(`/showtimes/admin/${id}`, payload)) as unknown;
  const item = (res as Record<string, unknown>)?.data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

export async function getShowtimeById(id: number): Promise<Showtime> {
  const res = (await axiosClient.get(`/showtimes/${id}`)) as unknown;
  return normalizeShowtime(res as Record<string, unknown>);
}

export async function generateSeats(id: number): Promise<{ created?: number } & Record<string, unknown>> {
  return (await axiosClient.post(
    `/showtimes/admin/${id}/generate-seats`,
  )) as unknown as { created?: number } & Record<string, unknown>;
}

export async function cancelShowtime(id: number): Promise<void> {
  await axiosClient.delete(`/showtimes/admin/${id}`);
}


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
        return [] as RoomOption[];
      }
    }),
  );

  return perCinema.flat();
}
