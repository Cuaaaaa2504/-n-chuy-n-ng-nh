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
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // GET /payments/methods — public, không cần auth
  // Phải đặt TRƯỚC các route có :id để NestJS không nhầm 'methods' là :id
  @Get('methods')
  getPaymentMethods() {
    return [
      {
        code: 'MOMO',
        name: 'Ví MoMo',
        enabled: false,
        note: 'Chưa cấu hình cổng MoMo',
      },
      {
        code: 'VNPAY',
        name: 'VNPay',
        enabled: false,
        note: 'Chưa cấu hình cổng VNPay',
      },
      {
        code: 'BANKING',
        name: 'Chuyển khoản ngân hàng',
        enabled: true,
        note: 'QR demo cho đồ án',
      },
      { code: 'MOCK', name: 'Thanh toán giả lập (Dev)', enabled: true },
      { code: 'CASH', name: 'Tiền mặt tại quầy', enabled: true },
    ];
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createPayment(@Request() req, @Body() dto: CreatePaymentDto) {
    const userId = req.user.userId ?? req.user.user_id;
    return this.paymentService.createPayment(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/success')
  async paymentSuccess(@Param('id') id: string) {
    return this.paymentService.processPaymentSuccess(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/failed')
  async paymentFailed(@Param('id') id: string) {
    return this.paymentService.processPaymentFailed(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('booking/:bookingId')
  async getPaymentByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }
}
