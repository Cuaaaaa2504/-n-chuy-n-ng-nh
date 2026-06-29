// src/modules/payments/payments.controller.ts
import { Controller, Post, Body, Param, Get, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Post(':id/success')
  async paymentSuccess(@Param('id') id: string) {
    return this.paymentsService.processPaymentSuccess(+id);
  }

  @Post(':id/failed')
  async paymentFailed(@Param('id') id: string) {
    return this.paymentsService.processPaymentFailed(+id);
  }

  @Get('booking/:bookingId')
  async getPaymentByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getPaymentByBookingId(+bookingId);
  }
}