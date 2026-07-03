export class PaymentResponse {
  paymentId: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionCode: string;
  paymentUrl?: string | null;
  createdAt: Date;
}
