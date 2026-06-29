// src/modules/payments/dto/payment-response.dto.ts
export class PaymentResponseDto {
  paymentId: number;
  paymentCode: string;
  bookingId: number;
  amount: number;
  status: string;
}