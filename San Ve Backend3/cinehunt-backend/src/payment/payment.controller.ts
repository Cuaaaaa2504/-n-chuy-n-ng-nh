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
import {
  PaymentAccess,
  PaymentAccessGuard,
} from './payment-access.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('methods')
  getPaymentMethods() {
    const demoEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_DEMO_PAYMENT === 'true';

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
        note: 'Tạo giao dịch chờ STAFF/ADMIN xác nhận',
      },
      {
        code: 'MOCK',
        name: 'Thanh toán giả lập (Dev)',
        enabled: demoEnabled,
        note: demoEnabled ? 'Chỉ dùng trong môi trường phát triển' : 'Đã tắt',
      },
      {
        code: 'CASH',
        name: 'Tiền mặt tại quầy',
        enabled: true,
        note: 'Tạo giao dịch chờ nhân viên tại quầy xác nhận',
      },
    ];
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createPayment(@Request() req, @Body() dto: CreatePaymentDto) {
    const userId = req.user.userId ?? req.user.user_id;
    return this.paymentService.createPayment(userId, dto);
  }

  @UseGuards(JwtAuthGuard, PaymentAccessGuard)
  @PaymentAccess('CONFIRM_PAYMENT')
  @Post(':id/success')
  async paymentSuccess(@Param('id') id: string) {
    return this.paymentService.processPaymentSuccess(id);
  }

  @UseGuards(JwtAuthGuard, PaymentAccessGuard)
  @PaymentAccess('FAIL_PAYMENT')
  @Post(':id/failed')
  async paymentFailed(@Param('id') id: string) {
    return this.paymentService.processPaymentFailed(id);
  }

  @UseGuards(JwtAuthGuard, PaymentAccessGuard)
  @PaymentAccess('READ_BOOKING')
  @Get('booking/:bookingId')
  async getPaymentByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }
}
