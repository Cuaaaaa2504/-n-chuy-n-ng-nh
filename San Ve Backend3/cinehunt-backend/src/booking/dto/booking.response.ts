export class BookingResponse {
  bookingId: number;
  bookingCode: string;
  showtimeId: number;
  seatCount: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  expiredAt: Date;
  paymentUrl?: string;
}