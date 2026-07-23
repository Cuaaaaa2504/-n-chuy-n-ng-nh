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

/** Đơn ở các trạng thái này thì tiền đã thực sự vào hệ thống -> mới hoàn được. */
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

  // ── Helper ──────────────────────────────────────────────────────────────

  /**
   * Tham số vào có thể là booking_id (BIGINT dạng chuỗi) HOẶC mã hiển thị
   * BK-xxxx. MyBookingsPage đang cầm cả hai nên chấp nhận cả hai cho chắc.
   */
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
      // Dùng 404 thay vì 403 để không tiết lộ đơn đó có tồn tại hay không.
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
  }

  /**
   * FIX [bảo mật]: trước đây hàm này nhận thẳng bookingId từ URL và trả về
   * toàn bộ refund của đơn đó, không hề biết người gọi là ai. Nay bắt buộc
   * truyền `user` và kiểm tra quyền sở hữu trước.
   */
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

  /** Xem chi tiết 1 refund — chỉ chủ đơn hoặc ADMIN. */
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

  /**
   * FIX [mục 5.1 — lỗi nghiêm trọng nhất của module này]
   *
   * `create(data: Partial<Refund>)` cũ lưu thẳng mọi field client gửi lên, kể
   * cả `refundAmount`, `refundStatus` và `completedAt`. Bất kỳ tài khoản nào
   * cũng tự "duyệt" cho mình một khoản hoàn tiền tuỳ ý trên đơn của người khác.
   *
   * Bản mới CHỈ nhận { bookingId, reason } và tự kiểm tra đủ 5 điều kiện:
   *   1. Đơn có tồn tại không.
   *   2. Đơn có thuộc về người đang gọi không.
   *   3. Đơn đã thực sự thanh toán chưa (phải có payment SUCCESS).
   *   4. Đã có yêu cầu hoàn tiền nào đang chờ / đã hoàn cho đơn này chưa
   *      (chặn spam tạo trùng -> chặn hoàn tiền 2 lần cho 1 đơn).
   *   5. Số tiền hoàn = số tiền ĐÃ TRẢ, lấy từ bảng payments, không lấy từ client.
   */
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
    // CK_refunds_amount CHECK (refund_amount > 0)
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
          // Luôn khởi tạo ở PENDING — chỉ ADMIN mới chuyển được sang SUCCESS/FAILED.
          refundStatus: 'PENDING',
          completedAt: null,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Không tạo được yêu cầu hoàn tiền');
    }
  }

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // FIX: trước đây không có endpoint nào cho admin xem/duyệt yêu cầu hoàn tiền.

  /** Danh sách tất cả yêu cầu hoàn tiền + filter + phân trang */
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

  /**
   * Admin duyệt yêu cầu hoàn tiền.
   *
   * FIX [báo cáo bỏ sót — hoàn tiền xong ghế vẫn kẹt]
   *
   * Bản cũ CHỈ đổi `refunds.refund_status` sang SUCCESS rồi dừng. Đơn hàng vẫn
   * mang status PAID, payment vẫn SUCCESS, `booking_details` vẫn ACTIVE và ghế
   * trong `showtime_seats` vẫn SOLD.
   *
   * Hệ quả: tiền đã trả lại cho khách nhưng ghế KHÔNG BAO GIỜ được bán lại —
   * rạp mất doanh thu của đúng ghế đó ở suất chiếu đó. Tệ hơn nữa, filtered
   * unique index `UX_booking_details_active_seat` vẫn thấy dòng ACTIVE cũ, nên
   * người khác đặt lại chính ghế ấy sẽ đâm vào duplicate key -> lỗi 500.
   *
   * Nay toàn bộ 5 bước chạy trong MỘT transaction, đồng bộ với cách
   * `BookingService.cancelBooking()` đang giải phóng ghế.
   */
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
      // 1. Chốt refund. CK_refunds_completed yêu cầu completed_at NOT NULL khi
      //    status = 'SUCCESS' -> phải set cùng lúc.
      await manager.update(
        Refund,
        { refundId: id },
        {
          refundStatus: 'SUCCESS',
          completedAt: now,
          ...(providerRef ? { providerRef } : {}),
        },
      );

      // 2. Đơn hàng chuyển sang REFUNDED (nằm trong CHECK constraint của
      //    booking_orders.status).
      await manager.update(BookingOrder, { bookingId }, { status: 'REFUNDED' });

      // 3. Giao dịch thanh toán gốc cũng phải phản ánh việc đã hoàn tiền,
      //    nếu không báo cáo doanh thu vẫn đếm nó là SUCCESS.
      await manager.update(
        Payment,
        { paymentId: String(refund.paymentId) },
        { paymentStatus: 'REFUNDED' },
      );

      // 4. Đóng booking_details để giải phóng filtered unique index.
      await manager.update(
        BookingDetail,
        { bookingId, status: 'ACTIVE' },
        { status: 'CANCELLED' },
      );

      // 5. Trả ghế về AVAILABLE để bán lại.
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

  /** Admin từ chối yêu cầu hoàn tiền */
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
