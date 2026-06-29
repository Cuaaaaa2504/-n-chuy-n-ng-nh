export class PaymentResponse {
  paymentId: number;
  bookingId: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionCode?: string;
  paymentUrl?: string;
  createdAt?: Date;
}
