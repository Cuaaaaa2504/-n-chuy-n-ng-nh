// src/types/showtime.ts
export interface Showtime {
  id: number;
  cinemaId?: number;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED';
}

export interface ShowtimeFormData {
  movieId: string;
  roomId: string;
  showDate: string;
  startTime: string;
  endTime: string;
}
