import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async createPayment(@Request() req, @Body() dto: CreatePaymentDto) {
    const userId = req.user.userId ?? req.user.user_id;
    return this.paymentService.createPayment(userId, dto);
  }

  @Post(':id/success')
  async paymentSuccess(@Param('id') id: string) {
    return this.paymentService.processPaymentSuccess(id);
  }

  @Post(':id/failed')
  async paymentFailed(@Param('id') id: string) {
    return this.paymentService.processPaymentFailed(id);
  }

  @Get('booking/:bookingId')
  async getPaymentByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }
}
