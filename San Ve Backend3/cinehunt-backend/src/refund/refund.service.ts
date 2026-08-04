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
    const booking = await this.resolveBooking(dto.bookingId);

    if (Number(booking.userId) !== Number(userId)) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (!REFUNDABLE_BOOKING_STATUS.includes(booking.status)) {
      throw new BadRequestException(
        `Đơn ở trạng thái ${booking.status} không thuộc diện được hoàn tiền`,
      );
    }

    const payment = await this.paymentRepo.findOne({
      where: { bookingId: String(booking.bookingId), paymentStatus: 'SUCCESS' },
      order: { paidAt: 'DESC' },
    });

    if (!payment) {
      throw new BadRequestException(
        'Đơn này chưa từng thanh toán thành công nên không có gì để hoàn',
      );
    }

    const existing = await this.repo.findOne({
      where: {
        bookingId: String(booking.bookingId),
        refundStatus: In(['PENDING', 'SUCCESS']),
      },
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

    try {
      return await this.repo.save(
        this.repo.create({
          bookingId: String(booking.bookingId),
          paymentId: String(payment.paymentId),
          refundAmount: amount,
          reason: dto.reason?.trim() || null,
          refundStatus: 'PENDING',
          completedAt: null,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Không tạo được yêu cầu hoàn tiền');
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
    const refund = await this.findOne(id);
    if (refund.refundStatus !== 'PENDING') {
      throw new BadRequestException(
        `Yêu cầu hoàn tiền #${id} đã được xử lý (trạng thái: ${refund.refundStatus})`,
      );
    }

    const bookingId = String(refund.bookingId);
    const now = new Date();

    const details = await this.dataSource.getRepository(BookingDetail).find({
      where: { bookingId },
      select: { bookingDetailId: true, showtimeSeatId: true },
    });
    const showtimeSeatIds = details.map((d) => d.showtimeSeatId);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Refund,
        { refundId: id },
        {
          refundStatus: 'SUCCESS',
          completedAt: now,
          ...(providerRef ? { providerRef } : {}),
        },
      );

      await manager.update(BookingOrder, { bookingId }, { status: 'REFUNDED' });

      await manager.update(
        Payment,
        { paymentId: String(refund.paymentId) },
        { paymentStatus: 'REFUNDED' },
      );

      await manager.update(
        BookingDetail,
        { bookingId, status: 'ACTIVE' },
        { status: 'CANCELLED' },
      );

      if (showtimeSeatIds.length) {
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(showtimeSeatIds) },
          { status: 'AVAILABLE', holdExpiresAt: null, heldByUserId: null },
        );
      }
    });

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
