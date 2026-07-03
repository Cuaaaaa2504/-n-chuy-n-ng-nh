import apiClient from './apiClient';

export const isSeatUnavailableError = (error) => error?.status === 409 || error?.code === 'SEAT_ALREADY_HELD';

export async function getSeatMap(showtimeId) {
  if (!showtimeId) throw new Error('Thiếu showtimeId');
  const payload = await apiClient.get(`/showtimes/${showtimeId}/seats`);
  return Array.isArray(payload) ? payload : payload?.data || payload?.items || [];
}

export async function holdSeats({ showtimeId, seatIds }) {
  if (!showtimeId) throw new Error('Thiếu showtimeId');
  if (!Array.isArray(seatIds) || seatIds.length === 0) throw new Error('Vui lòng chọn ít nhất 1 ghế');
  return apiClient.post('/bookings/hold-seats', { showtimeId, seatIds });
}

export async function releaseSeats({ holdId, showtimeId, seatIds }) {
  if (!holdId && (!showtimeId || !seatIds?.length)) return { success: true };
  return apiClient.post('/bookings/release-seats', { holdId, showtimeId, seatIds });
}
