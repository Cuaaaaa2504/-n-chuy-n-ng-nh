// src/booking/booking.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, LessThan, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold, SeatHoldStatus } from '../entities/seat-hold.entity';
import { Voucher } from '../entities/voucher.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
import {
  BookingResponse,
  CreateBookingRequest,
} from './dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(BookingOrder)
    private readonly bookingRepo: Repository<BookingOrder>,
    @InjectRepository(BookingDetail)
    private readonly detailRepo: Repository<BookingDetail>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepo: Repository<ShowtimeSeat>,
    @InjectRepository(SeatHold)
    private readonly holdRepo: Repository<SeatHold>,
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(ConcessionCombo)
    private readonly productRepo: Repository<ConcessionCombo>,
    @InjectRepository(BookingCombo)
    private readonly bookingComboRepo: Repository<BookingCombo>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * FIX [bookingId must be a UUID]
   *
   * `booking_id` là BIGINT IDENTITY còn `booking_code` là chuỗi BK-xxx. Nếu truyền
   * thẳng "BK-1784554863343-ZPJ6" vào `where: { bookingId }` thì mssql sẽ ném lỗi
   * convert varchar -> bigint (HTTP 500 khó debug). Helper này nhận vào một tham
   * chiếu booking bất kỳ (id số hoặc mã BK-xxx) và trả về điều kiện `where` đúng cột.
   */
  private buildBookingRef(ref: string | number): FindOptionsWhere<BookingOrder> {
    const value = String(ref ?? '').trim();

    if (!value) {
      throw new BadRequestException('Thiếu mã đơn đặt vé (bookingId)');
    }

    if (/^\d+$/.test(value)) {
      return { bookingId: value };
    }

    if (/^BK-/i.test(value)) {
      return { bookingCode: value.toUpperCase() };
    }

    throw new BadRequestException(`Mã đơn đặt vé không hợp lệ: ${value}`);
  }

  async createBooking(userId: number, request: CreateBookingRequest): Promise<BookingResponse> {
    const now = new Date();

    // FIX [BUG-03]: hold_id là BIGINT -> luôn so sánh dưới dạng chuỗi.
    // DTO đã Transform về string[] nhưng vẫn chuẩn hoá lại ở đây để service an toàn
    // khi được gọi trực tiếp (unit test, service khác) mà không qua ValidationPipe.
    const holdIds = [
      ...new Set(
        (request.holdIds ?? [])
          .map((id) => String(id).trim())
          .filter((id) => /^\d+$/.test(id)),
      ),
    ];

    // FIX [BUG-03]: In([]) sinh ra SQL rỗng -> lỗi cú pháp -> 500.
    // Chặn sớm bằng 400 với thông báo rõ ràng.
    if (!holdIds.length) {
      throw new BadRequestException('Danh sách ghế đang giữ (holdIds) không hợp lệ');
    }

    const holds = await this.holdRepo.find({
      where: {
        holdId: In(holdIds),
        userId,
        status: SeatHoldStatus.ACTIVE,
      },
      relations: { showtimeSeat: true },
    });

    if (holds.length !== holdIds.length) {
      const found = new Set(holds.map((h) => String(h.holdId)));
      const missing = holdIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Một hoặc nhiều hold không hợp lệ hoặc đã hết hiệu lực (holdId: ${missing.join(', ')})`,
      );
    }

    if (holds.some((h) => new Date(h.expiresAt) <= now)) {
      throw new BadRequestException('Có hold đã hết hạn');
    }

    const distinctShowtimeIds = [...new Set(holds.map((h) => h.showtimeSeat.showtimeId))];
    if (distinctShowtimeIds.length !== 1) {
      throw new BadRequestException('Các ghế phải thuộc cùng một suất chiếu');
    }

    const showtimeId = distinctShowtimeIds[0];
    const subtotalAmount = holds.reduce((sum, h) => sum + Number(h.showtimeSeat.price), 0);

    // Gộp các dòng trùng productId lại thành 1 dòng.
    // booking_combos có UNIQUE (booking_id, combo_id) -> gửi trùng sẽ gây
    // duplicate key error -> 500. Gộp trước khi insert là cách xử lý an toàn.
    const requestedProducts = Object.values(
      (request.products ?? []).reduce<Record<number, { productId: number; quantity: number }>>(
        (acc, item) => {
          const key = Number(item.productId);
          if (!acc[key]) acc[key] = { productId: key, quantity: 0 };
          acc[key].quantity += Number(item.quantity);
          return acc;
        },
        {},
      ),
    );
    const productIds = requestedProducts.map((p) => p.productId);
    const products = productIds.length
      ? await this.productRepo.find({ where: { comboId: In(productIds), status: 'ACTIVE' } })
      : [];

    if (products.length !== productIds.length) {
      throw new BadRequestException('Có sản phẩm không tồn tại hoặc không hoạt động');
    }

    const productAmount = requestedProducts.reduce((sum, item) => {
      const product = products.find((p) => p.comboId === item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);

    let discountAmount = 0;
    let appliedPromotionId: number | null = request.promotionId ?? null;

    if (request.voucherCode) {
      const voucher = await this.voucherRepo.findOne({
        where: { promotionCode: request.voucherCode.toUpperCase() },
      });

      if (!voucher || voucher.status !== 'ACTIVE') {
        throw new BadRequestException('Voucher không hợp lệ hoặc đã hết hạn');
      }

      // FIX [H-02]: kiểm tra usageLimit trước khi áp dụng voucher
      if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
        throw new BadRequestException('Voucher đã hết lượt sử dụng');
      }

      // Kiểm tra thời gian hiệu lực
      const vNow = new Date();
      if (voucher.startAt && vNow < new Date(voucher.startAt)) {
        throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
      }
      if (voucher.endAt && vNow > new Date(voucher.endAt)) {
        throw new BadRequestException('Voucher đã hết hạn');
      }

      const orderTotal = subtotalAmount + productAmount;
      if (voucher.minOrderAmount && orderTotal < Number(voucher.minOrderAmount)) {
        throw new BadRequestException(
          `Đơn hàng tối thiểu ${Number(voucher.minOrderAmount).toLocaleString()}đ để dùng voucher này`,
        );
      }

      if (voucher.discountType === 'PERCENTAGE') {
        discountAmount = (orderTotal * Number(voucher.discountValue)) / 100;
        if (voucher.maxDiscount) {
          discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
        }
      } else {
        discountAmount = Math.min(Number(voucher.discountValue), orderTotal);
      }

      appliedPromotionId = voucher.promotionId;
    }

    // Làm tròn 2 chữ số thập phân cho khớp DECIMAL(12,2) của SQL Server.
    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    const roundedSubtotal = round2(subtotalAmount);
    const roundedProduct = round2(productAmount);
    // CK_booking_amounts yêu cầu discount_amount <= subtotal + product.
    const roundedDiscount = Math.min(
      round2(discountAmount),
      roundedSubtotal + roundedProduct,
    );
    const totalAmount = Math.max(
      0,
      round2(roundedSubtotal + roundedProduct - roundedDiscount),
    );
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const showtimeSeatIds = holds.map((h) => h.showtimeSeat.showtimeSeatId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        // FIX [M-03]: thêm random suffix để tránh bookingCode trùng khi 2 request đến cùng millisecond
        const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const booking = manager.create(BookingOrder, {
          bookingCode: `BK-${Date.now()}-${randomSuffix}`,
          userId,
          showtimeId,
          promotionId: appliedPromotionId,
          subtotalAmount: roundedSubtotal,
          discountAmount: roundedDiscount,
          productAmount: roundedProduct,
          totalAmount,
          status: 'PENDING_PAYMENT',
          expiresAt,
        });

        // FIX [BUG-01]: KHÔNG dựa vào việc TypeORM mutate object `booking`.
        // Dùng giá trị trả về của save() và ép về string (BIGINT).
        // Nếu vẫn không có id -> dừng ngay với thông báo rõ ràng thay vì để các
        // INSERT sau fail vì booking_id NULL (FK error -> 500 khó debug).
        const saved = await manager.save(BookingOrder, booking);
        const savedBookingId = String(saved?.bookingId ?? booking.bookingId ?? '');

        if (!savedBookingId || savedBookingId === 'undefined' || savedBookingId === 'null') {
          throw new InternalServerErrorException(
            'Không lấy được bookingId sau khi tạo đơn. Vui lòng thử lại.',
          );
        }

        // FIX [BUG-05]: dọn booking_details "mồ côi".
        // DB có filtered unique index UX_booking_details_active_seat trên
        // (showtime_seat_id) WHERE status = 'ACTIVE'. cancelBooking() và
        // expirePendingBookings() trước đây KHÔNG đổi status của booking_details,
        // nên các dòng ACTIVE cũ vẫn còn -> lần đặt lại chính ghế đó sẽ vi phạm
        // unique index -> SQL error -> "Internal server error".
        // Ở đây ta đóng các dòng ACTIVE thuộc booking đã CANCELLED/EXPIRED/FAILED.
        await manager
          .createQueryBuilder()
          .update(BookingDetail)
          .set({ status: 'CANCELLED' })
          .where('showtime_seat_id IN (:...seatIds)', { seatIds: showtimeSeatIds })
          .andWhere('status = :active', { active: 'ACTIVE' })
          .andWhere(
            'booking_id IN (SELECT booking_id FROM booking_orders WHERE status IN (:...deadStatuses))',
            { deadStatuses: ['CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED'] },
          )
          .execute();

        // Nếu vẫn còn dòng ACTIVE của một booking còn hiệu lực -> ghế thật sự đã bị
        // người khác đặt. Trả 400 có nghĩa thay vì để DB ném duplicate key -> 500.
        const stillActive = await manager.count(BookingDetail, {
          where: { showtimeSeatId: In(showtimeSeatIds), status: 'ACTIVE' },
        });
        if (stillActive > 0) {
          throw new BadRequestException(
            'Một hoặc nhiều ghế đã được đặt bởi đơn hàng khác. Vui lòng chọn ghế khác.',
          );
        }

        // FIX [BUG-02]: dùng insert() thay cho save().
        // save() sẽ reload entity sau INSERT (chạy SELECT lấy computed column),
        // gây lỗi/conflict trong transaction với driver mssql. insert() chỉ ghi
        // đúng các cột insertable và lấy IDENTITY qua OUTPUT INSERTED.
        await manager.insert(
          BookingDetail,
          holds.map((hold) => ({
            bookingId: savedBookingId,
            showtimeSeatId: hold.showtimeSeat.showtimeSeatId,
            seatPrice: hold.showtimeSeat.price,
            status: 'ACTIVE',
          })),
        );

        if (requestedProducts.length) {
          // FIX [BUG-02]: total_price là computed column (PERSISTED) -> không bao giờ
          // được gửi trong INSERT và không reload lại sau INSERT.
          await manager.insert(
            BookingCombo,
            requestedProducts.map((item) => {
              const product = products.find((p) => p.comboId === item.productId)!;
              return {
                bookingId: savedBookingId,
                comboId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
              };
            }),
          );
        }

        await manager.update(
          SeatHold,
          { holdId: In(holdIds) },
          { status: SeatHoldStatus.CONVERTED },
        );

        // Đánh dấu ghế đã bán để sơ đồ ghế hiển thị đúng.
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(showtimeSeatIds) },
          { status: 'SOLD' },
        );

        // FIX [H-02]: tăng usedCount của voucher sau khi booking thành công
        if (request.voucherCode && appliedPromotionId) {
          await manager.increment(Voucher, { promotionId: appliedPromotionId }, 'usedCount', 1);
        }

        return {
          bookingId: savedBookingId,
          bookingCode: booking.bookingCode,
          showtimeId,
          seatCount: holds.length,
          subtotalAmount: roundedSubtotal,
          productAmount: roundedProduct,
          discountAmount: roundedDiscount,
          totalAmount,
          status: 'PENDING_PAYMENT',
          expiresAt,
        } satisfies BookingResponse;
      });
    } catch (err) {
      // FIX [BUG-04 phía backend]: log stack trace đầy đủ và trả message có nghĩa
      // thay vì để NestJS nuốt thành "Internal server error" chung chung.
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;

      const driverMessage =
        (err as { driverError?: { message?: string } })?.driverError?.message ??
        (err as { message?: string })?.message ??
        'Lỗi không xác định';

      this.logger.error(
        `createBooking thất bại (userId=${userId}, holdIds=[${holdIds.join(',')}]): ${driverMessage}`,
        (err as Error)?.stack,
      );

      throw new InternalServerErrorException(`Không tạo được đơn hàng: ${driverMessage}`);
    }
  }

  async validateBookingForPayment(bookingRef: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Booking đang ở trạng thái ${booking.status}, không thể thanh toán`,
      );
    }

    if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
      throw new BadRequestException('Booking đã hết hạn thanh toán');
    }

    return {
      ...booking,
      // Luôn trả về ID số đã phân giải để tầng gọi (PaymentService) không vô tình
      // dùng lại chuỗi BK-xxx do client gửi lên.
      bookingId: String(booking.bookingId),
      finalAmount: Number(booking.totalAmount),
    };
  }

  async expirePendingBookings(): Promise<{ expiredCount: number }> {
    const now = new Date();

    const expiredBookings = await this.bookingRepo.find({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: LessThan(now),
      },
      relations: { bookingDetails: { showtimeSeat: true } },
    });

    if (!expiredBookings.length) {
      return { expiredCount: 0 };
    }

    const bookingIds = expiredBookings.map((b) => b.bookingId);

    const allSeatIds = expiredBookings.flatMap((b) =>
      b.bookingDetails.map((d: any) => d.showtimeSeatId),
    );

    // FIX [C-02]: bọc toàn bộ expirePendingBookings trong một transaction duy nhất
    // để đảm bảo atomic — nếu một bước fail, toàn bộ rollback, tránh data inconsistent
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        BookingOrder,
        { bookingId: In(bookingIds) },
        { status: 'EXPIRED', cancelledAt: now },
      );

      // FIX [BUG-05]: phải đóng booking_details, nếu không dòng status='ACTIVE'
      // vẫn còn và filtered unique index UX_booking_details_active_seat sẽ chặn
      // mọi lần đặt lại ghế đó (duplicate key -> 500).
      await manager.update(
        BookingDetail,
        { bookingId: In(bookingIds), status: 'ACTIVE' },
        { status: 'EXPIRED' },
      );

      if (allSeatIds.length) {
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(allSeatIds) },
          { status: 'AVAILABLE', holdExpiresAt: null, heldByUserId: null },
        );

        await manager.update(
          SeatHold,
          { showtimeSeatId: In(allSeatIds), status: SeatHoldStatus.ACTIVE },
          { status: SeatHoldStatus.EXPIRED, releasedAt: now },
        );
      }

      if (bookingIds.length) {
        await manager.delete(BookingCombo, { bookingId: In(bookingIds) });
      }
    });

    return { expiredCount: expiredBookings.length };
  }

  async getMyBookings(userId: number) {
    // FIX BUG-02: trước đây chỉ SELECT bảng booking_orders thuần, không join
    // showtime / movie / room / cinema / bookingDetails / seat => frontend nhận
    // movieTitle, cinemaName, roomName, showDate, showTime, seatCodes = undefined.
    // Load đầy đủ relations giống getBookingDetail để thẻ vé hiển thị đủ thông tin.
    return this.bookingRepo.find({
      where: { userId },
      relations: {
        bookingDetails: { showtimeSeat: { seat: true } as any },
        showtime: { movie: true, room: { cinema: true } as any } as any,
        bookingCombos: { combo: true } as any,
      } as any,
      order: { createdAt: 'DESC' },
    });
  }

  /** Lấy chi tiết booking kèm thông tin vé — dùng cho GET :id/tickets */
  async getBookingTickets(bookingRef: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
      relations: {
        bookingDetails: { showtimeSeat: { seat: true } as any },
        showtime: { movie: true, room: { cinema: true } as any } as any,
        bookingCombos: { combo: true } as any,
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async getBookingDetail(bookingRef: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
      relations: {
        bookingDetails: { showtimeSeat: { seat: true } as any },
        showtime: { movie: true, room: { cinema: true } as any } as any,
        bookingCombos: { combo: true } as any,
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async cancelBooking(bookingRef: string, userId: number) {
    const now = new Date();

    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
      relations: { bookingDetails: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Booking không thể hủy ở trạng thái hiện tại');
    }

    const showtimeSeatIds = booking.bookingDetails.map((d: any) => d.showtimeSeatId);

    // ID số đã phân giải — dùng cho mọi UPDATE bên dưới (tham số vào có thể là BK-xxx).
    const bookingId = String(booking.bookingId);

    // FIX [C-01]: bỜ cancelBooking trong transaction — nếu một bước fail,
    // toàn bộ rollback tránh trường hợp booking CANCELLED nhưng ghế vẫn HELD
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        BookingOrder,
        { bookingId },
        { status: 'CANCELLED', cancelledAt: now },
      );

      // FIX [BUG-05]: đóng booking_details để giải phóng filtered unique index
      // UX_booking_details_active_seat, cho phép ghế được đặt lại.
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

        // Release SeatHold tương ứng khi cancel booking
        await manager.update(
          SeatHold,
          {
            showtimeSeatId: In(showtimeSeatIds),
            status: In([SeatHoldStatus.ACTIVE, SeatHoldStatus.CONVERTED]),
          },
          { status: SeatHoldStatus.CANCELLED, releasedAt: now },
        );
      }
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────────────────

  /** Trạng thái booking hợp lệ (SQL CHECK trên booking_orders.status) */
  static readonly ADMIN_ALLOWED_STATUS = [
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PAID',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
  ];

  /**
   * FIX [Critical]: AdminBookingsPage cần xem TOÀN BỘ đơn đặt vé.
   * Trước đây chỉ có GET /bookings/my (lọc theo userId) nên trang admin
   * phải dùng mock data.
   */
  async adminFindAll(filters: {
    bookingCode?: string;
    customerName?: string;
    movieTitle?: string;
    paymentStatus?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.showtime', 'showtime')
      .leftJoinAndSelect('showtime.movie', 'movie')
      .leftJoinAndSelect('showtime.room', 'room')
      .leftJoinAndSelect('room.cinema', 'cinema')
      .leftJoinAndSelect('booking.bookingDetails', 'detail')
      .leftJoinAndSelect('detail.showtimeSeat', 'showtimeSeat')
      .leftJoinAndSelect('showtimeSeat.seat', 'seat')
      .orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.bookingCode?.trim()) {
      qb.andWhere('booking.bookingCode LIKE :code', {
        code: `%${filters.bookingCode.trim()}%`,
      });
    }
    if (filters.customerName?.trim()) {
      qb.andWhere('user.fullName LIKE :name', {
        name: `%${filters.customerName.trim()}%`,
      });
    }
    if (filters.movieTitle?.trim()) {
      qb.andWhere('movie.title LIKE :title', {
        title: `%${filters.movieTitle.trim()}%`,
      });
    }
    if (filters.status?.trim()) {
      qb.andWhere('booking.status = :status', { status: filters.status.trim() });
    }
    // Frontend gửi paymentStatus (PAID/PENDING/FAILED/REFUNDED) — map ngược về booking.status
    if (filters.paymentStatus?.trim()) {
      const mapped = this.mapPaymentStatusToBookingStatus(filters.paymentStatus.trim());
      if (mapped.length) {
        qb.andWhere('booking.status IN (:...statuses)', { statuses: mapped });
      }
    }
    if (filters.fromDate) {
      qb.andWhere('booking.createdAt >= :fromDate', {
        fromDate: new Date(filters.fromDate),
      });
    }
    if (filters.toDate) {
      qb.andWhere('booking.createdAt <= :toDate', {
        toDate: new Date(filters.toDate),
      });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((b) => this.toAdminBookingRow(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Admin chủ động cập nhật trạng thái đơn hàng */
  async adminUpdateStatus(bookingId: string, status: string) {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (!BookingService.ADMIN_ALLOWED_STATUS.includes(normalized)) {
      throw new BadRequestException(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${BookingService.ADMIN_ALLOWED_STATUS.join(', ')}`,
      );
    }

    const booking = await this.bookingRepo.findOne({
      where: { bookingId },
      relations: { bookingDetails: true },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    if (booking.status === normalized) return booking;

    const now = new Date();
    const showtimeSeatIds = (booking.bookingDetails ?? []).map(
      (d: any) => d.showtimeSeatId,
    );

    await this.dataSource.transaction(async (manager) => {
      const patch: Partial<BookingOrder> = { status: normalized };
      if (normalized === 'PAID' || normalized === 'CONFIRMED') patch.paidAt = now;
      if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(normalized))
        patch.cancelledAt = now;

      await manager.update(BookingOrder, { bookingId }, patch);

      // Giải phóng ghế nếu đơn bị huỷ/hết hạn/hoàn tiền
      if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(normalized)) {
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
          await manager.update(
            SeatHold,
            {
              showtimeSeatId: In(showtimeSeatIds),
              status: In([SeatHoldStatus.ACTIVE, SeatHoldStatus.CONFIRMED, SeatHoldStatus.CONVERTED]),
            },
            { status: SeatHoldStatus.CANCELLED, releasedAt: now },
          );
        }
      }

      // Đánh dấu ghế đã bán khi xác nhận thanh toán
      if (['PAID', 'CONFIRMED'].includes(normalized) && showtimeSeatIds.length) {
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(showtimeSeatIds) },
          { status: 'SOLD', holdExpiresAt: null },
        );
      }
    });

    this.logger.log(
      `Admin đổi trạng thái booking #${bookingId}: ${booking.status} -> ${normalized}`,
    );

    return this.bookingRepo.findOne({ where: { bookingId } });
  }

  /** Admin xem chi tiết bất kỳ booking nào (không giới hạn userId) */
  async adminGetBookingDetail(bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId },
      relations: {
        user: true,
        bookingDetails: { showtimeSeat: { seat: true } as any },
        showtime: { movie: true, room: { cinema: true } as any } as any,
        bookingCombos: { combo: true } as any,
      } as any,
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  private mapPaymentStatusToBookingStatus(paymentStatus: string): string[] {
    switch (paymentStatus.toUpperCase()) {
      case 'PAID':
        return ['PAID', 'CONFIRMED'];
      case 'PENDING':
        return ['PENDING_PAYMENT'];
      case 'FAILED':
        return ['CANCELLED', 'EXPIRED', 'FAILED'];
      case 'REFUNDED':
        return ['REFUNDED'];
      default:
        return [];
    }
  }

  private mapBookingStatusToPaymentStatus(status: string): string {
    if (['PAID', 'CONFIRMED'].includes(status)) return 'PAID';
    if (status === 'PENDING_PAYMENT') return 'PENDING';
    if (status === 'REFUNDED') return 'REFUNDED';
    return 'FAILED';
  }

  /** Map booking entity -> shape mà AdminBookingsPage / BookingTable đang dùng */
  private toAdminBookingRow(booking: any) {
    const showtime = booking.showtime;
    const seats = (booking.bookingDetails ?? [])
      .map((d: any) => d?.showtimeSeat?.seat?.seatLabel)
      .filter(Boolean);

    return {
      bookingId: Number(booking.bookingId),
      bookingCode: booking.bookingCode,
      customerName: booking.user?.fullName ?? 'Khách vãng lai',
      customerEmail: booking.user?.email ?? null,
      movieTitle: showtime?.movie?.title ?? '—',
      cinemaName: showtime?.room?.cinema?.cinemaName ?? null,
      roomName: showtime?.room?.roomName ?? null,
      showtime: showtime?.startTime ?? null,
      seats,
      totalAmount: Number(booking.totalAmount ?? 0),
      status: booking.status,
      paymentStatus: this.mapBookingStatusToPaymentStatus(booking.status),
      createdAt: booking.createdAt,
    };
  }
}
