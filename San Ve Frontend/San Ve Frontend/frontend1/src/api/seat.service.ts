import axiosClient from './axiosClient';
import type { SeatDto, SeatId, SeatStatus } from '../types/seat.types';

export function normalizeSeat(raw: Record<string, unknown>): SeatDto {
  return {
    id:         (raw.id ?? raw.showtimeSeatId ?? raw.seatId) as SeatId,
    rowName:    String(raw.rowName ?? raw.seatRow ?? ''),
    seatNumber: Number(raw.seatNumber ?? 0),
    status:     (raw.status ?? raw.seatStatus ?? 'AVAILABLE') as SeatStatus,
    type:       (raw.type ?? raw.seatTypeCode ?? raw.seatTypeName) as string | undefined,
    price:      raw.price != null ? Number(raw.price) : undefined,
  };
}

interface SeatMapRawResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  totalSeats?: number;
  seatsGenerated?: boolean;
  seats: Record<string, unknown>[];
}

export interface SeatMapResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  seatsGenerated: boolean;
  totalSeats: number;
  seats: SeatDto[];
}

export interface HoldItem {
  holdId: string;
  holdToken: string;
  expiresAt: string;
  status: string;
  showtimeSeatId: number;
  seatLabel: string;
  price: number;
}

interface BookSeatsResponse {
  bookingId?: number | string;
  bookingCode?: string;
  showtimeId?: number;
  seatCount?: number;
  subtotalAmount?: number;
  productAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  status?: string;
  expiresAt?: string | null;
  success?: boolean;
  message?: string;
}

export const seatService = {
  getSeatsByShowtime: async (showtimeId: string | number): Promise<SeatDto[]> => {
    const data = await axiosClient.get<unknown, SeatMapRawResponse>(
      `/showtime-seats/${showtimeId}`,
    );
    return (data.seats ?? []).map(normalizeSeat);
  },

  getSeatMap: async (showtimeId: string | number): Promise<SeatMapResponse> => {
    const data = await axiosClient.get<unknown, SeatMapRawResponse>(
      `/showtime-seats/${showtimeId}`,
    );
    const seats = (data.seats ?? []).map(normalizeSeat);
    return {
      ...data,
      seats,
      totalSeats: data.totalSeats ?? seats.length,
      seatsGenerated: data.seatsGenerated ?? seats.length > 0,
    };
  },

  holdSeats: async (seatIds: number[], holdMinutes?: number): Promise<HoldItem[]> => {
    const res = await axiosClient.post<unknown, HoldItem[]>(
      `/showtime-seats/hold-many`,
      holdMinutes != null
        ? { showtimeSeatIds: seatIds, holdMinutes }
        : { showtimeSeatIds: seatIds },
    );
    return Array.isArray(res) ? res : [];
  },

  bookSeats: async (
    holdIds: string[],
    options?: { voucherCode?: string; promotionId?: number; idempotencyKey?: string },
  ): Promise<BookSeatsResponse> => {
    const body: Record<string, unknown> = { holdIds };
    if (options?.voucherCode)    body.voucherCode    = options.voucherCode;
    if (options?.promotionId)    body.promotionId    = options.promotionId;
    if (options?.idempotencyKey) body.idempotencyKey = options.idempotencyKey;

    return axiosClient.post<unknown, BookSeatsResponse>(`/bookings`, body);
  },
};
