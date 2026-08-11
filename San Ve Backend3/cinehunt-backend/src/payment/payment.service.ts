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
import { Voucher } from '../entities/voucher.entity';
import { BookingService } from '../booking/booking.service';
import { COUNTER_PAYMENT_GRACE_MINUTES } from '../booking/booking-state.policy';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto, PaymentResponse } from './dto';
import { hasVoucherUsageRemaining } from './voucher-usage.policy';
import { canSwitchPendingPaymentMethod } from './payment-method-switch.policy';

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

    const validatedBooking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
      { skipExpiryCheck: true },
    );
    const bookingId = String(validatedBooking.bookingId);

    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(BookingOrder, {
        where: { bookingId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException('Không tìm thấy booking');
      }
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException(
          `Booking đang ở trạng thái ${booking.status}, không thể thanh toán`,
        );
      }
      const existingPending = await manager.findOne(Payment, {
        where: { bookingId, paymentStatus: 'PENDING' },
        lock: { mode: 'pessimistic_write' },
      });

      // CASH/PENDING đã chuyển sang chính sách giữ tới showtime + grace.
      // Retry cùng CASH chỉ idempotent khi vẫn còn trong cửa sổ giữ tại quầy.
      // Dùng giờ SQL Server để đồng nhất với BookingExpireScheduler và loại
      // race khi cron chưa kịp đánh dấu booking EXPIRED.
      if (
        existingPending?.paymentMethod === 'CASH' &&
        dto.paymentMethod === 'CASH'
      ) {
        const retryWindowRows = (await manager.query(
          `
            SELECT TOP (1)
              CAST(
                CASE
                  WHEN DATEADD(MINUTE, @1, st.start_time) >
                    CAST(
                      SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time'
                      AS DATETIME2
                    )
                  THEN 1 ELSE 0
                END
                AS BIT
              ) AS within_grace
            FROM dbo.showtimes AS st
            WHERE st.showtime_id = @0;
          `,
          [booking.showtimeId, COUNTER_PAYMENT_GRACE_MINUTES],
        )) as Array<{ within_grace: boolean | number }>;

        if (!Boolean(retryWindowRows[0]?.within_grace)) {
          throw new BadRequestException(
            'Đơn thanh toán tại quầy đã quá thời gian giữ',
          );
        }

        return this.toPaymentResponse(existingPending);
      }

      if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
        throw new BadRequestException('Booking đã hết hạn thanh toán');
      }

      if (existingPending) {
        if (existingPending.paymentMethod === dto.paymentMethod) {
          return this.toPaymentResponse(existingPending);
        }

        if (
          !canSwitchPendingPaymentMethod(
            existingPending.paymentMethod,
            dto.paymentMethod,
          )
        ) {
          throw new BadRequestException(
            'Đơn đã chọn thanh toán tiền mặt tại quầy. Hãy hủy đơn nếu muốn đổi phương thức thanh toán.',
          );
        }

        const reason =
          `User switched payment method from ${existingPending.paymentMethod} to ${dto.paymentMethod}`;

        await manager.update(
          Payment,
          {
            paymentId: existingPending.paymentId,
            paymentStatus: 'PENDING',
          },
          {
            paymentStatus: 'FAILED',
            failedReason: reason,
            providerResponse: reason,
          },
        );
      }

      const payment = await manager.save(
        Payment,
        manager.create(Payment, {
          bookingId,
          paymentMethod: dto.paymentMethod,
          provider: dto.provider ?? null,
          amount: Number(booking.totalAmount),
          transactionCode: this.paymentRepository.generatePaymentCode(),
          paymentStatus: 'PENDING',
          providerResponse: null,
          failedReason: null,
          paidAt: null,
        }),
      );

      // CASH giữ nguyên expiresAt/holdExpiresAt trong DB.
      // BookingExpireScheduler nhận biết CASH/PENDING và chỉ hết hạn
      // theo mốc showtime + COUNTER_PAYMENT_GRACE_MINUTES.
      return this.toPaymentResponse(payment);
    });
  }

  private toPaymentResponse(payment: Payment): PaymentResponse {
    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      transactionCode: payment.transactionCode ?? '',
      createdAt: payment.createdAt,
    };
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
              ) >= DATEADD(MINUTE, -30, st.start_time)
                AND CAST(
                  SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time'
                  AS DATETIME2
                ) < DATEADD(MINUTE, @1, st.start_time)
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
      [normalized, COUNTER_PAYMENT_GRACE_MINUTES],
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
        'Đơn tại quầy chỉ được xác nhận từ 30 phút trước đến 10 phút sau giờ chiếu',
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

    await this.processPaymentSuccess(row.payment_id, {
      allowExpiredCounterPayment: true,
    });

    return {
      confirmed: true,
      bookingId: row.booking_id,
      paymentId: row.payment_id,
    };
  }

  async processPaymentSuccess(
    paymentId: string,
    options: { allowExpiredCounterPayment?: boolean } = {},
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentSnapshot = await queryRunner.manager.findOne(Payment, {
        where: { paymentId },
      });
      if (!paymentSnapshot) {
        throw new NotFoundException('Không tìm thấy payment');
      }

      const booking = await queryRunner.manager.findOne(BookingOrder, {
        where: { bookingId: paymentSnapshot.bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) throw new NotFoundException('Không tìm thấy booking');
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
      }
      const mayConfirmExpiredCounterPayment =
        options.allowExpiredCounterPayment === true &&
        paymentSnapshot.paymentMethod === 'CASH' &&
        paymentSnapshot.paymentStatus === 'PENDING';

      if (
        !mayConfirmExpiredCounterPayment &&
        booking.expiresAt &&
        new Date(booking.expiresAt) <= new Date()
      ) {
        throw new BadRequestException('Booking đã hết hạn');
      }

      const payment = await queryRunner.manager.findOne(Payment, {
        where: { paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Không tìm thấy payment');
      if (payment.bookingId !== booking.bookingId) {
        throw new BadRequestException('Payment không thuộc booking đang xử lý');
      }
      if (payment.paymentStatus !== 'PENDING') {
        throw new BadRequestException(
          `Payment status là ${payment.paymentStatus}, chỉ PENDING mới được xử lý`,
        );
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

      if (booking.promotionId) {
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { promotionId: booking.promotionId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!voucher) {
          throw new BadRequestException('Voucher của booking không còn tồn tại');
        }

        if (!hasVoucherUsageRemaining(voucher.usedCount, voucher.usageLimit)) {
          throw new BadRequestException('Voucher đã hết lượt sử dụng');
        }

        await queryRunner.manager.increment(
          Voucher,
          { promotionId: booking.promotionId },
          'usedCount',
          1,
        );
      }

      await queryRunner.manager.update(Payment, { paymentId }, {
        paymentStatus: 'SUCCESS',
        failedReason: null,
        paidAt: new Date(),
      });

      const seatIds = bookingDetails.map((d) => d.showtimeSeatId);

      const soldResult = await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: 'SOLD', holdExpiresAt: null, heldByUserId: null })
        .where('showtime_seat_id IN (:...ids)', { ids: seatIds })
        .andWhere('status = :held', { held: 'HELD' })
        .andWhere('held_by_user_id = :userId', { userId: booking.userId })
        .execute();

      if ((soldResult.affected ?? 0) !== seatIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều ghế không còn được giữ bởi booking này',
        );
      }

      await queryRunner.manager.update(
        BookingOrder,
        { bookingId: booking.bookingId },
        { status: 'PAID', paidAt: new Date(), issuedAt: new Date() },
      );

      await queryRunner.manager.update(
        SeatHold,
        {
          showtimeSeatId: In(seatIds),
          userId: booking.userId,
          status: SeatHoldStatus.CONVERTED,
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
    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    // cancelBooking tự khóa BookingOrder và fail toàn bộ PENDING payment
    // trong cùng transaction. Không fail payment trước rồi mới cancel booking.
    try {
      await this.bookingService.cancelBooking(payment.bookingId, booking.userId);
    } catch (error) {
      const latest = await this.paymentRepository.findPaymentById(paymentId);
      if (latest?.paymentStatus === 'FAILED') {
        return {
          success: true,
          idempotent: true,
          paymentId,
          status: 'FAILED',
        };
      }
      throw error;
    }

    return {
      success: true,
      idempotent: false,
      paymentId,
      status: 'FAILED',
    };
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
