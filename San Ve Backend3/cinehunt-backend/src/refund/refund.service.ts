import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Refund } from '../entities/refund.entity';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { SeatHold, SeatHoldStatus } from '../entities/seat-hold.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

const REFUNDABLE_BOOKING_STATUS = ['PAID', 'ISSUED', 'CONFIRMED', 'CANCELLED'];

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private readonly repo: Repository<Refund>,
    @InjectRepository(BookingOrder)
    private readonly bookingRepo: Repository<BookingOrder>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  // Helper

  private async resolveBooking(bookingRef: string): Promise<BookingOrder> {
    const where = /^\d+$/.test(bookingRef)
      ? { bookingId: bookingRef }
      : { bookingCode: bookingRef };

    const booking = await this.bookingRepo.findOne({ where: where as any });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn hàng');
    return booking;
  }

  private assertCanRead(booking: BookingOrder, user: CurrentUserPayload) {
    if (user.role === 'ADMIN') return;
    if (Number(booking.userId) !== Number(user.userId)) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
  }

  async findByBooking(
    bookingRef: string,
    user: CurrentUserPayload,
  ): Promise<Refund[]> {
    const booking = await this.resolveBooking(bookingRef);
    this.assertCanRead(booking, user);

    try {
      return await this.repo.find({
        where: { bookingId: String(booking.bookingId) },
        order: { requestedAt: 'DESC' },
      });
    } catch {
      throw new InternalServerErrorException('Không tải được danh sách hoàn tiền');
    }
  }

  async findOneForUser(id: string, user: CurrentUserPayload): Promise<Refund> {
    const refund = await this.findOne(id);
    const booking = await this.resolveBooking(String(refund.bookingId));
    this.assertCanRead(booking, user);
    return refund;
  }

  async findOne(id: string): Promise<Refund> {
    try {
      const refund = await this.repo.findOne({ where: { refundId: id } });
      if (!refund) throw new NotFoundException(`Refund #${id} không tồn tại`);
      return refund;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không tải được thông tin hoàn tiền');
    }
  }

  async createForUser(dto: CreateRefundDto, userId: number): Promise<Refund> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const bookingRef = String(dto.bookingId ?? '').trim();
        const where = /^\d+$/.test(bookingRef)
          ? { bookingId: bookingRef }
          : { bookingCode: bookingRef };

        const booking = await manager.findOne(BookingOrder, {
          where: where as any,
          lock: { mode: 'pessimistic_write' },
        });

        if (!booking || Number(booking.userId) !== Number(userId)) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (!REFUNDABLE_BOOKING_STATUS.includes(booking.status)) {
          throw new BadRequestException(
            `Đơn ở trạng thái ${booking.status} không thuộc diện được hoàn tiền`,
          );
        }

        const usedTickets = (await manager.query(
          `
            SELECT TOP (1) t.ticket_id
            FROM dbo.tickets AS t
            INNER JOIN dbo.booking_details AS bd
              ON bd.booking_detail_id = t.booking_detail_id
            WHERE bd.booking_id = @0
              AND t.ticket_status = 'USED';
          `,
          [String(booking.bookingId)],
        )) as Array<{ ticket_id: string }>;

        if (usedTickets.length > 0) {
          throw new BadRequestException(
            'Đơn đã có vé được check-in nên không thể yêu cầu hoàn tiền',
          );
        }

        const payment = await manager.findOne(Payment, {
          where: {
            bookingId: String(booking.bookingId),
            paymentStatus: 'SUCCESS',
          },
          order: { paidAt: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });

        if (!payment) {
          throw new BadRequestException(
            'Đơn này chưa từng thanh toán thành công nên không có gì để hoàn',
          );
        }

        const existing = await manager.findOne(Refund, {
          where: {
            bookingId: String(booking.bookingId),
            refundStatus: In(['PENDING', 'SUCCESS']),
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (existing) {
          throw new BadRequestException(
            existing.refundStatus === 'PENDING'
              ? 'Đơn này đã có một yêu cầu hoàn tiền đang chờ xử lý'
              : 'Đơn này đã được hoàn tiền',
          );
        }

        const amount = Number(payment.amount ?? 0);
        if (!(amount > 0)) {
          throw new BadRequestException('Số tiền đã thanh toán không hợp lệ');
        }

        return manager.save(
          Refund,
          manager.create(Refund, {
            bookingId: String(booking.bookingId),
            paymentId: String(payment.paymentId),
            refundAmount: amount,
            reason: dto.reason?.trim() || null,
            refundStatus: 'PENDING',
            completedAt: null,
          }),
        );
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const sqlNumber =
        (error as { number?: number; driverError?: { number?: number } })?.number ??
        (error as { driverError?: { number?: number } })?.driverError?.number;

      if (sqlNumber === 2601 || sqlNumber === 2627) {
        throw new BadRequestException(
          'Đơn này đã có một yêu cầu hoàn tiền đang chờ xử lý',
        );
      }

      throw new InternalServerErrorException(
        'Không tạo được yêu cầu hoàn tiền',
      );
    }
  }

  // ADMIN

  async adminFindAll(filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

    const qb = this.repo
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.booking', 'booking')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('refund.requestedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status?.trim()) {
      qb.andWhere('refund.refundStatus = :status', {
        status: filters.status.trim().toUpperCase(),
      });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r: any) => ({
        refundId: String(r.refundId),
        bookingId: String(r.bookingId),
        bookingCode: r.booking?.bookingCode ?? null,
        customerName: r.booking?.user?.fullName ?? null,
        customerEmail: r.booking?.user?.email ?? null,
        paymentId: String(r.paymentId),
        refundAmount: Number(r.refundAmount ?? 0),
        reason: r.reason,
        refundStatus: r.refundStatus,
        requestedAt: r.requestedAt,
        completedAt: r.completedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approve(id: string, providerRef?: string): Promise<Refund> {
    const now = new Date();

    try {
      await this.dataSource.transaction(async (manager) => {
        const refund = await manager.findOne(Refund, {
          where: { refundId: id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!refund) {
          throw new NotFoundException(`Refund #${id} không tồn tại`);
        }

        if (refund.refundStatus !== 'PENDING') {
          throw new BadRequestException(
            `Yêu cầu hoàn tiền #${id} đã được xử lý (trạng thái: ${refund.refundStatus})`,
          );
        }

        const bookingId = String(refund.bookingId);
        const booking = await manager.findOne(BookingOrder, {
          where: { bookingId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!booking) {
          throw new NotFoundException('Không tìm thấy đơn hàng của refund');
        }

        const ticketRows = (await manager.query(
          `
            SELECT
              t.ticket_id,
              t.ticket_status
            FROM dbo.tickets AS t WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN dbo.booking_details AS bd
              ON bd.booking_detail_id = t.booking_detail_id
            WHERE bd.booking_id = @0;
          `,
          [bookingId],
        )) as Array<{ ticket_id: string; ticket_status: string }>;

        if (ticketRows.some((ticket) => ticket.ticket_status === 'USED')) {
          throw new BadRequestException(
            'Không thể hoàn tiền vì đơn đã có vé được check-in',
          );
        }

        const details = await manager.find(BookingDetail, {
          where: { bookingId },
          select: { bookingDetailId: true, showtimeSeatId: true },
        });

        const bookingDetailIds = details.map((detail) =>
          String(detail.bookingDetailId),
        );
        const showtimeSeatIds = [
          ...new Set(details.map((detail) => detail.showtimeSeatId)),
        ];

        await manager.update(
          Refund,
          { refundId: id, refundStatus: 'PENDING' },
          {
            refundStatus: 'SUCCESS',
            completedAt: now,
            ...(providerRef ? { providerRef } : {}),
          },
        );

        await manager.update(
          BookingOrder,
          { bookingId },
          { status: 'REFUNDED', cancelledAt: now },
        );

        await manager.update(
          Payment,
          {
            paymentId: String(refund.paymentId),
            paymentStatus: 'SUCCESS',
          },
          { paymentStatus: 'REFUNDED' },
        );

        if (bookingDetailIds.length > 0) {
          await manager.update(
            Ticket,
            {
              bookingDetailId: In(bookingDetailIds),
              ticketStatus: 'VALID',
            },
            { ticketStatus: 'CANCELLED' },
          );
        }

        await manager.update(
          BookingDetail,
          { bookingId, status: 'ACTIVE' },
          { status: 'CANCELLED' },
        );

        if (showtimeSeatIds.length > 0) {
          await manager.update(
            SeatHold,
            {
              showtimeSeatId: In(showtimeSeatIds),
              userId: booking.userId,
              status: In([
                SeatHoldStatus.CONVERTED,
                SeatHoldStatus.CONFIRMED,
              ]),
            },
            {
              status: SeatHoldStatus.CANCELLED,
              releasedAt: now,
            },
          );

          await manager.update(
            ShowtimeSeat,
            {
              showtimeSeatId: In(showtimeSeatIds),
              status: In(['SOLD', 'HELD']),
            },
            {
              status: 'AVAILABLE',
              holdExpiresAt: null,
              heldByUserId: null,
            },
          );
        }
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Không duyệt được yêu cầu hoàn tiền',
      );
    }

    return this.findOne(id);
  }

  /* Admin từ chối yêu cầu hoàn tiền */
  async reject(id: string, reason?: string): Promise<Refund> {
    const refund = await this.findOne(id);
    if (refund.refundStatus !== 'PENDING') {
      throw new BadRequestException(
        `Yêu cầu hoàn tiền #${id} đã được xử lý (trạng thái: ${refund.refundStatus})`,
      );
    }
    await this.repo.update(
      { refundId: id },
      {
        refundStatus: 'FAILED',
        completedAt: new Date(),
        ...(reason ? { reason } : {}),
      },
    );
    return this.findOne(id);
  }
}
