import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { Payment } from '../entities/payment.entity';
import {
  canAccessPayment,
  PaymentAccessMode,
  PaymentPrincipal,
} from './payment-access.policy';

export const PAYMENT_ACCESS_MODE = 'payment_access_mode';
export const PaymentAccess = (mode: PaymentAccessMode) =>
  SetMetadata(PAYMENT_ACCESS_MODE, mode);

type AuthenticatedRequest = Request & {
  user?: PaymentPrincipal;
  params: Record<string, string>;
};

@Injectable()
export class PaymentAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.getAllAndOverride<PaymentAccessMode>(
      PAYMENT_ACCESS_MODE,
      [context.getHandler(), context.getClass()],
    );
    if (!mode) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.user;
    if (!principal?.userId) throw new UnauthorizedException('Chưa đăng nhập');

    const allowDemoPayment =
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('ALLOW_DEMO_PAYMENT') === 'true';

    let booking: BookingOrder | null = null;
    let paymentMethod: string | undefined;

    if (mode === 'READ_BOOKING') {
      const bookingId = String(request.params.bookingId ?? '').trim();
      booking = await this.dataSource.getRepository(BookingOrder).findOne({
        where: { bookingId },
      });
      if (!booking) throw new NotFoundException('Không tìm thấy booking');
    } else {
      const paymentId = String(request.params.id ?? '').trim();
      const payment = await this.dataSource.getRepository(Payment).findOne({
        where: { paymentId },
      });
      if (!payment) throw new NotFoundException('Không tìm thấy payment');

      paymentMethod = payment.paymentMethod;
      booking = await this.dataSource.getRepository(BookingOrder).findOne({
        where: { bookingId: payment.bookingId },
      });
      if (!booking) throw new NotFoundException('Không tìm thấy booking');
    }

    const allowed = canAccessPayment({
      principal,
      ownerId: booking.userId,
      paymentMethod,
      mode,
      allowDemoPayment,
    });

    if (!allowed) {
      throw new ForbiddenException(
        mode === 'CONFIRM_PAYMENT'
          ? 'Bạn không có quyền xác nhận payment này'
          : 'Bạn không có quyền truy cập payment này',
      );
    }

    return true;
  }
}
