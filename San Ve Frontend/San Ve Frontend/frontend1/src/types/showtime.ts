// src/types/showtime.ts
//
// FIX BUG-03/BUG-04: kiểu dữ liệu được viết lại cho khớp với entity `showtimes`
// của backend (San Ve Backend3):
//   - PK là `showtime_id`, không phải `id`
//   - KHÔNG có cột `show_date`; `start_time` / `end_time` là DATETIME2 đầy đủ
//   - có cột bắt buộc `base_price`
//   - status CHECK ('OPEN', 'CLOSED', 'CANCELLED') — không phải ACTIVE/FINISHED

/** Trạng thái suất chiếu — khớp CHECK constraint trong SQL V6.3 */
export type ShowtimeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Showtime {
  /** = showtime_id */
  id: number;
  movieId: number;
  roomId: number;
  cinemaId?: number;

  /** Tên hiển thị, lấy từ relation hoặc map ở tầng hook */
  movieTitle: string;
  cinemaName: string;
  roomName: string;

  /** ISO datetime đầy đủ, ví dụ '2026-07-10T19:30:00.000Z' */
  startTime: string;
  endTime: string;

  /** Tiện ích cho bảng admin: phần ngày (YYYY-MM-DD) tách từ startTime */
  showDate: string;

  basePrice: number;
  status: ShowtimeStatus;
}

/**
 * Dữ liệu form — vẫn tách ngày / giờ cho dễ nhập liệu.
 * Tầng api (`showtimeApi.ts`) chịu trách nhiệm ghép lại thành ISO datetime
 * và ép movieId/roomId về number trước khi gửi lên backend.
 */
export interface ShowtimeFormData {
  movieId: string;
  roomId: string;
  showDate: string;   // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  basePrice: string;  // giữ dạng string để bind trực tiếp vào <input type="number">
}

/** Payload gửi lên backend — khớp CreateShowtimeDto */
export interface ShowtimePayload {
  movieId: number;
  roomId: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  basePrice: number;
}

/** Option cho các <select> trong ShowtimeForm */
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
