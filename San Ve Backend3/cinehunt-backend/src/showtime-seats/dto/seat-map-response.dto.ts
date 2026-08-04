/*
 * Contract chính thức của GET /showtime-seats/:showtimeId
 * còn frontend lại cần `id / rowName / type / status`, nên phải có hàm
 * `normalizeSeat()` dịch tay ở `seat.service.ts`. Bất kỳ ai đổi tên field ở
 * backend mà quên sửa normalizeSeat đều làm ghế hiển thị sai loại, sai trạng
 * thái, hoặc giá về 0 — mà không có lỗi nào báo ra.
 * Nay contract được khai báo tường minh ở đây và trả về ĐÚNG tên frontend dùng.
 * Các tên cũ vẫn được giữ như alias @deprecated để không vỡ trong lúc deploy
 * lệch phiên bản giữa FE và BE; có thể xoá sau khi FE đã lên bản mới.
 */

export type SeatMapSeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';

export interface SeatMapSeatDto {
  /** Khóa chính showtime_seats — chính là id frontend dùng để hold ghế */
  id: number;
  seatId: number;
  showtimeId: number;

  /** Ký hiệu hàng, ví dụ 'A' */
  rowName: string | null;
  seatNumber: number | null;
  seatLabel: string | null;

  /** Mã loại ghế: STANDARD | VIP | COUPLE ... */
  type: string | null;
  typeName: string | null;
  seatTypeId: number | null;

  status: SeatMapSeatStatus;
  price: number;

  heldByUserId: number | null;
  holdExpiresAt: Date | null;

  /** @deprecated dùng `id` */
  showtimeSeatId: number;
  /** @deprecated dùng `rowName` */
  seatRow: string | null;
  /** @deprecated dùng `type` */
  seatTypeCode: string | null;
  /** @deprecated dùng `status` */
  seatStatus: SeatMapSeatStatus;
}

export interface SeatMapResponseDto {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: Date | null;
  endTime: Date | null;

  /** Tổng số ghế. 0 nghĩa là suất chiếu TỒN TẠI nhưng chưa được sinh ghế. */
  totalSeats: number;

  /*
   * Cờ tường minh để frontend phân biệt
   * "suất chiếu chưa có sơ đồ ghế" với "gọi API thất bại".
   */
  seatsGenerated: boolean;

  seats: SeatMapSeatDto[];
}
