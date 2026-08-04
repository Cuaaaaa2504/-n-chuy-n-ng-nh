
export type SeatMapSeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';

export interface SeatMapSeatDto {
  id: number;
  seatId: number;
  showtimeId: number;

  rowName: string | null;
  seatNumber: number | null;
  seatLabel: string | null;

  type: string | null;
  typeName: string | null;
  seatTypeId: number | null;

  status: SeatMapSeatStatus;
  price: number;

  heldByUserId: number | null;
  holdExpiresAt: Date | null;

  showtimeSeatId: number;
  seatRow: string | null;
  seatTypeCode: string | null;
  seatStatus: SeatMapSeatStatus;
}

export interface SeatMapResponseDto {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: Date | null;
  endTime: Date | null;

  totalSeats: number;

  seatsGenerated: boolean;

  seats: SeatMapSeatDto[];
}
