import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, In } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import {
  SeatHold,
  SeatHoldStatus,
} from '../entities/seat-hold.entity';
import { Ticket } from '../entities/ticket.entity';
import { BookingService } from '../booking/booking.service';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto, PaymentResponse } from './dto';

type CounterPaymentCheckRow = {
  booking_id: string;
  booking_status: string;
  payment_id: string | null;
  payment_method: string | null;
  payment_status: string | null;
  can_check_in: boolean | number;
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(userId: number, dto: CreatePaymentDto): Promise<PaymentResponse> {
    if (dto.paymentMethod === 'MOCK' && !this.isDemoPaymentEnabled()) {
      throw new ForbiddenException(
        'Thanh toán giả lập chỉ được bật trong môi trường phát triển.',
      );
    }

    const booking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
    );

    const bookingId = String(booking.bookingId);

    const existingPending =
      await this.paymentRepository.findPendingByBookingId(bookingId);
    if (existingPending) {
      if (existingPending.paymentMethod === dto.paymentMethod) {
        if (dto.paymentMethod === 'CASH') {
          await this.disableCounterPaymentExpiry(bookingId);
        }

        return {
          paymentId: existingPending.paymentId,
          bookingId: existingPending.bookingId,
          amount: Number(existingPending.amount),
          paymentMethod: existingPending.paymentMethod,
          paymentStatus: existingPending.paymentStatus,
          transactionCode: existingPending.transactionCode ?? '',
          createdAt: existingPending.createdAt,
        };
      }

      await this.paymentRepository.updatePaymentFailed(
        existingPending.paymentId,
        `User switched payment method from ${existingPending.paymentMethod} to ${dto.paymentMethod}`,
      );
    }

    const transactionCode = this.paymentRepository.generatePaymentCode();

    const payment = await this.paymentRepository.createPayment({
      bookingId,
      paymentMethod: dto.paymentMethod,
      provider: dto.provider ?? null,
      amount: booking.finalAmount,
      transactionCode,
      paymentStatus: 'PENDING',
      providerResponse: null,
      failedReason: null,
      paidAt: null,
    });

    if (dto.paymentMethod === 'CASH') {
      await this.disableCounterPaymentExpiry(bookingId);
    }

    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      transactionCode: payment.transactionCode,
      createdAt: payment.createdAt,
    };
  }

  private async disableCounterPaymentExpiry(bookingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const details = await manager.find(BookingDetail, {
        where: { bookingId, status: 'ACTIVE' },
      });
      const seatIds = details.map((detail) => detail.showtimeSeatId);

      await manager.update(
        BookingOrder,
        { bookingId },
        { expiresAt: null },
      );

      if (seatIds.length) {
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(seatIds) },
          { holdExpiresAt: null },
        );
      }
    });
  }

  async confirmPendingCashPaymentForCheckIn(bookingCode: string) {
    const normalized = String(bookingCode ?? '').trim().toUpperCase();

    if (!/^BK-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
      throw new BadRequestException('Mã đơn tại quầy không hợp lệ');
    }

    const rows = (await this.dataSource.query(
      `
        SELECT TOP (1)
          CONVERT(VARCHAR(30), bo.booking_id) AS booking_id,
          bo.status AS booking_status,
          CONVERT(VARCHAR(30), latest_payment.payment_id) AS payment_id,
          latest_payment.payment_method,
          latest_payment.payment_status,
          CAST(
            CASE
              WHEN CAST(
                SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time'
                AS DATETIME2
              ) BETWEEN DATEADD(MINUTE, -30, st.start_time)
                AND DATEADD(MINUTE, 30, st.start_time)
              THEN 1 ELSE 0
            END
            AS BIT
          ) AS can_check_in
        FROM dbo.booking_orders AS bo
        INNER JOIN dbo.showtimes AS st
          ON st.showtime_id = bo.showtime_id
        OUTER APPLY (
          SELECT TOP (1)
            p.payment_id,
            p.payment_method,
            p.payment_status
          FROM dbo.payments AS p
          WHERE p.booking_id = bo.booking_id
          ORDER BY p.created_at DESC, p.payment_id DESC
        ) AS latest_payment
        WHERE bo.booking_code = @0;
      `,
      [normalized],
    )) as CounterPaymentCheckRow[];

    const row = rows[0];

    if (!row) {
      throw new NotFoundException(`Đơn ${normalized} không tồn tại`);
    }

    if (row.booking_status !== 'PENDING_PAYMENT') {
      return {
        confirmed: false,
        bookingId: row.booking_id,
        bookingStatus: row.booking_status,
      };
    }

    if (!Boolean(row.can_check_in)) {
      throw new BadRequestException(
        'Đơn tại quầy chỉ được xác nhận trong khoảng 30 phút trước hoặc sau giờ chiếu',
      );
    }

    if (
      row.payment_method !== 'CASH' ||
      row.payment_status !== 'PENDING' ||
      !row.payment_id
    ) {
      throw new BadRequestException(
        'Đơn này chưa được chọn thanh toán tiền mặt tại quầy',
      );
    }

    // Hỗ trợ cả các payment CASH được tạo trước khi bản sửa này được áp dụng.
    await this.disableCounterPaymentExpiry(row.booking_id);
    await this.processPaymentSuccess(row.payment_id);

    return {
      confirmed: true,
      bookingId: row.booking_id,
      paymentId: row.payment_id,
    };
  }

  async processPaymentSuccess(paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { paymentId },
      });

      if (!payment) throw new NotFoundException('Không tìm thấy payment');

      if (payment.paymentStatus !== 'PENDING') {
        throw new BadRequestException(
          `Payment status là ${payment.paymentStatus}, chỉ PENDING mới được xử lý`,
        );
      }

      const booking = await queryRunner.manager.findOne(BookingOrder, {
        where: { bookingId: payment.bookingId },
        relations: { bookingDetails: true },
      });

      if (!booking) throw new NotFoundException('Không tìm thấy booking');
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
      }

      if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
        throw new BadRequestException('Booking đã hết hạn');
      }

      if (Number(payment.amount) !== Number(booking.totalAmount)) {
        throw new BadRequestException(
          'Số tiền payment không khớp tổng tiền booking',
        );
      }

      const bookingDetails = await queryRunner.manager.find(BookingDetail, {
        where: { bookingId: booking.bookingId, status: 'ACTIVE' },
        relations: ['showtimeSeat', 'showtimeSeat.seat'],
      });

      if (!bookingDetails.length) {
        throw new BadRequestException('Không tìm thấy ghế trong booking');
      }

      await queryRunner.manager.update(Payment, { paymentId }, {
        paymentStatus: 'SUCCESS',
        failedReason: null,
        paidAt: new Date(),
      });

      const seatIds = bookingDetails.map((d) => d.showtimeSeatId);

      await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: 'SOLD', holdExpiresAt: null, heldByUserId: null })
        .where('showtime_seat_id IN (:...ids)', { ids: seatIds })
        .execute();

      await queryRunner.manager.update(
        BookingOrder,
        { bookingId: booking.bookingId },
        { status: 'PAID', paidAt: new Date(), issuedAt: new Date() },
      );

      await queryRunner.manager.update(
        SeatHold,
        {
          showtimeSeatId: In(seatIds),
          status: In([SeatHoldStatus.ACTIVE, SeatHoldStatus.CONVERTED]),
        },
        { status: SeatHoldStatus.CONFIRMED, releasedAt: new Date() },
      );

      const tickets: any[] = [];

      for (const detail of bookingDetails) {
        const seatLabel = detail.showtimeSeat?.seat
          ? `${detail.showtimeSeat.seat.seatRow}${detail.showtimeSeat.seat.seatNumber}`
          : null;

        const existing = await queryRunner.manager.findOne(Ticket, {
          where: { bookingDetailId: String(detail.bookingDetailId) },
        });

        if (existing) {
          tickets.push({
            ticketId: existing.ticketId,
            ticketCode: existing.ticketCode,
            qrCode: existing.qrCode,
            seatLabel,
            price: Number(detail.seatPrice),
          });
          continue;
        }

        const newTicket = await queryRunner.manager.save(
          queryRunner.manager.create(Ticket, {
            bookingDetailId: String(detail.bookingDetailId),
            ticketCode: this.paymentRepository.generateTicketCode(),
            qrCode: this.paymentRepository.generateQrCode(),
            ticketStatus: 'VALID',
            issuedAt: new Date(),
            checkedInAt: null,
            checkedInBy: null,
          }),
        );

        tickets.push({
          ticketId: newTicket.ticketId,
          ticketCode: newTicket.ticketCode,
          qrCode: newTicket.qrCode,
          seatLabel,
          price: Number(detail.seatPrice),
        });
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        paymentId,
        bookingId: booking.bookingId,
        tickets,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processPaymentFailed(paymentId: string) {
    const payment = await this.paymentRepository.findPaymentById(paymentId);

    if (!payment) throw new NotFoundException('Không tìm thấy payment');

    if (payment.paymentStatus === 'FAILED') {
      return {
        success: true,
        idempotent: true,
        paymentId,
        status: 'FAILED',
      };
    }

    if (payment.paymentStatus !== 'PENDING') {
      throw new BadRequestException(
        `Payment status là ${payment.paymentStatus}, chỉ PENDING mới được hủy`,
      );
    }

    const booking = await this.dataSource.getRepository(BookingOrder).findOne({
      where: { bookingId: payment.bookingId },
    });

    await this.paymentRepository.updatePaymentFailed(paymentId, 'Payment failed by system');

    if (booking?.status === 'PENDING_PAYMENT') {
      await this.bookingService.cancelBooking(payment.bookingId, booking.userId);
    }

    return { success: true, idempotent: false, paymentId, status: 'FAILED' };
  }

  async getPaymentByBookingId(bookingId: string) {
    const ref = String(bookingId ?? '').trim();
    if (!/^\d+$/.test(ref)) {
      throw new BadRequestException(
        'bookingId phải là ID số của đơn đặt vé (không phải mã BK-xxx)',
      );
    }

    const payment = await this.paymentRepository.findLatestByBookingId(ref);

    if (!payment) throw new NotFoundException('Không tìm thấy payment của booking');

    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      transactionCode: payment.transactionCode,
      failedReason: payment.failedReason,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  private isDemoPaymentEnabled(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('ALLOW_DEMO_PAYMENT') === 'true'
    );
  }
}
