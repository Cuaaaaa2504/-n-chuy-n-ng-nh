// src/api/showtimeApi.ts
import axiosClient from './axiosClient';
import type { Showtime, ShowtimeFormData } from '../types/showtime';

function normalizeShowtime(item: Record<string, unknown>): Showtime {
  return {
    id: Number(item.id ?? item.showtimeId ?? 0),
    movieTitle: (item.movieTitle ?? (item.movie as Record<string, unknown>)?.title ?? '') as string,
    cinemaName: (item.cinemaName ?? (item.cinema as Record<string, unknown>)?.name ?? '') as string,
    roomName:   (item.roomName   ?? (item.room   as Record<string, unknown>)?.name ?? '') as string,
    showDate:   (item.showDate   ?? item.date  ?? '') as string,
    startTime:  (item.startTime  ?? item.start ?? '') as string,
    endTime:    (item.endTime    ?? item.end   ?? '') as string,
    status:     (item.status     ?? 'ACTIVE')  as Showtime['status'],
  };
}

/** Lấy toàn bộ suất chiếu (admin) */
export async function getAllShowtimes(): Promise<Showtime[]> {
  const payload = await axiosClient.get('/showtimes') as unknown;
  const raw = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>).data as unknown[] ?? []);
  return (raw as Record<string, unknown>[]).map(normalizeShowtime);
}

/** Lấy suất chiếu theo phim (trang người dùng) */
export async function getShowtimesByMovie(movieId: number): Promise<Showtime[]> {
  const payload = await axiosClient.get(`/showtimes/movie/${movieId}`) as unknown;
  const raw = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>).data as unknown[] ?? []);
  return (raw as Record<string, unknown>[]).map(normalizeShowtime);
}

/** Thêm suất chiếu mới */
export async function createShowtime(data: ShowtimeFormData): Promise<Showtime> {
  const res = await axiosClient.post('/showtimes', data) as unknown;
  const item = (res as Record<string, unknown>).data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

/** Cập nhật suất chiếu */
export async function updateShowtime(id: number, data: ShowtimeFormData): Promise<Showtime> {
  const res = await axiosClient.put(`/showtimes/${id}`, data) as unknown;
  const item = (res as Record<string, unknown>).data ?? res;
  return normalizeShowtime(item as Record<string, unknown>);
}

/** Hủy suất chiếu */
export async function cancelShowtime(id: number): Promise<void> {
  await axiosClient.patch(`/showtimes/${id}/cancel`);
}
