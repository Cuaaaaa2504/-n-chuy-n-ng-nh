export class BookingResponse {
  bookingId: string;
  bookingCode: string;
  showtimeId: number;
  seatCount: number;
  subtotalAmount: number;
  productAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  expiresAt: Date | null;
}
