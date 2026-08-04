
export type ShowtimeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Showtime {
  id: number;
  movieId: number;
  roomId: number;
  cinemaId?: number;

  movieTitle: string;
  cinemaName: string;
  roomName: string;

  startTime: string;
  endTime: string;

  showDate: string;

  basePrice: number;
  status: ShowtimeStatus;

  updatedAt?: string;
}

export interface ShowtimeFormData {
  movieId: string;
  roomId: string;
  showDate: string;   // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  basePrice: string;  // giữ dạng string để bind trực tiếp vào <input type="number">
}

export interface ShowtimePayload {
  movieId: number;
  roomId: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  basePrice: number;
  expectedUpdatedAt?: string;
}

export interface MovieOption {
  id: number;
  title: string;
}

export interface RoomOption {
  id: number;
  name: string;
  cinemaId: number;
  cinemaName: string;
}
