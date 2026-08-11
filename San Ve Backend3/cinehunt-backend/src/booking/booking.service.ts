import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, In, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold, SeatHoldStatus } from '../entities/seat-hold.entity';
import { Voucher } from '../entities/voucher.entity';
import { Payment } from '../entities/payment.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
import {
  buildPendingPaymentSeatState,
  canAdminTransitionBooking,
  canUserCancelBooking,
  COUNTER_PAYMENT_GRACE_MINUTES,
} from './booking-state.policy';
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

  private async releaseBookingSeatsSafely(
    manager: EntityManager,
    bookingId: string,
    userId: number,
    seatIds: number[],
    terminalHoldStatus: SeatHoldStatus.EXPIRED | SeatHoldStatus.CANCELLED,
    now: Date,
  ): Promise<number[]> {
    const releasedSeatIds: number[] = [];

    for (const seatId of [...new Set(seatIds)]) {
      const rows = (await manager.query(
        `
          UPDATE ss
          SET
            ss.status = 'AVAILABLE',
            ss.hold_expires_at = NULL,
            ss.held_by_user_id = NULL
          OUTPUT INSERTED.showtime_seat_id AS showtime_seat_id
          FROM dbo.showtime_seats AS ss WITH (UPDLOCK, ROWLOCK)
          WHERE ss.showtime_seat_id = @0
            AND ss.status = 'HELD'
            AND ss.held_by_user_id = @1
            AND NOT EXISTS (
              SELECT 1
              FROM dbo.seat_holds AS active_hold
              WHERE active_hold.showtime_seat_id = ss.showtime_seat_id
                AND active_hold.status = 'ACTIVE'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM dbo.booking_details AS other_detail
              INNER JOIN dbo.booking_orders AS other_booking
                ON other_booking.booking_id = other_detail.booking_id
              WHERE other_detail.showtime_seat_id = ss.showtime_seat_id
                AND other_detail.booking_id <> @2
                AND other_detail.status = 'ACTIVE'
                AND other_booking.status IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED')
            );
        `,
        [seatId, userId, bookingId],
      )) as Array<{ showtime_seat_id: number }>;

      if (rows.length > 0) {
        releasedSeatIds.push(Number(rows[0].showtime_seat_id));
      }
    }

    if (releasedSeatIds.length) {
      await manager.update(
        SeatHold,
        {
          showtimeSeatId: In(releasedSeatIds),
          userId,
          status: SeatHoldStatus.CONVERTED,
        },
        { status: terminalHoldStatus, releasedAt: now },
      );
    }

    return releasedSeatIds;
  }

  async createBooking(userId: number, request: CreateBookingRequest): Promise<BookingResponse> {
    const now = new Date();

    const holdIds = [
      ...new Set(
        (request.holdIds ?? [])
          .map((id) => String(id).trim())
          .filter((id) => /^\d+$/.test(id)),
      ),
    ];

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
    let appliedPromotionId: number | null = null;

    if (request.voucherCode) {
      const voucher = await this.voucherRepo.findOne({
        where: { promotionCode: request.voucherCode.toUpperCase() },
      });

      if (!voucher || voucher.status !== 'ACTIVE') {
        throw new BadRequestException('Voucher không hợp lệ hoặc đã hết hạn');
      }

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

    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    const roundedSubtotal = round2(subtotalAmount);
    const roundedProduct = round2(productAmount);
    const roundedDiscount = Math.min(
      round2(discountAmount),
      roundedSubtotal + roundedProduct,
    );
    const totalAmount = Math.max(
      0,
      round2(roundedSubtotal + roundedProduct - roundedDiscount),
    );
    const expiresAt = new Date(
      Math.min(
        ...holds.map((hold) =>
          new Date(hold.expiresAt).getTime(),
        ),
      ),
    );

    const showtimeSeatIds = holds.map((h) => h.showtimeSeat.showtimeSeatId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const transactionNow = new Date();

        const lockedSeats = await manager
          .getRepository(ShowtimeSeat)
          .createQueryBuilder('showtimeSeat')
          .setLock('pessimistic_write')
          .where('showtimeSeat.showtimeSeatId IN (:...seatIds)', {
            seatIds: showtimeSeatIds,
          })
          .getMany();

        if (
          lockedSeats.length !== showtimeSeatIds.length ||
          lockedSeats.some(
            (seat) =>
              seat.status !== 'HELD' ||
              seat.heldByUserId !== userId ||
              !seat.holdExpiresAt ||
              new Date(seat.holdExpiresAt) <= transactionNow,
          )
        ) {
          throw new BadRequestException(
            'Một hoặc nhiều ghế không còn được giữ hợp lệ. Vui lòng chọn lại ghế.',
          );
        }

        const lockedHolds = await manager
          .getRepository(SeatHold)
          .createQueryBuilder('hold')
          .setLock('pessimistic_write')
          .where('hold.holdId IN (:...holdIds)', { holdIds })
          .andWhere('hold.userId = :userId', { userId })
          .andWhere('hold.status = :active', { active: SeatHoldStatus.ACTIVE })
          .getMany();

        if (
          lockedHolds.length !== holdIds.length ||
          lockedHolds.some((hold) => new Date(hold.expiresAt) <= transactionNow)
        ) {
          throw new BadRequestException(
            'Một hoặc nhiều hold đã hết hạn hoặc đã được xử lý bởi request khác.',
          );
        }

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

        const saved = await manager.save(BookingOrder, booking);
        const savedBookingId = String(saved?.bookingId ?? booking.bookingId ?? '');

        if (!savedBookingId || savedBookingId === 'undefined' || savedBookingId === 'null') {
          throw new InternalServerErrorException(
            'Không lấy được bookingId sau khi tạo đơn. Vui lòng thử lại.',
          );
        }

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

        const stillActive = await manager.count(BookingDetail, {
          where: { showtimeSeatId: In(showtimeSeatIds), status: 'ACTIVE' },
        });
        if (stillActive > 0) {
          throw new BadRequestException(
            'Một hoặc nhiều ghế đã được đặt bởi đơn hàng khác. Vui lòng chọn ghế khác.',
          );
        }

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

        const convertedHolds = await manager.update(
          SeatHold,
          {
            holdId: In(holdIds),
            userId,
            status: SeatHoldStatus.ACTIVE,
          },
          { status: SeatHoldStatus.CONVERTED },
        );

        if ((convertedHolds.affected ?? 0) !== holdIds.length) {
          throw new BadRequestException(
            'Hold đã thay đổi trong lúc tạo booking. Vui lòng đặt lại.',
          );
        }

        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(showtimeSeatIds) },
          buildPendingPaymentSeatState(userId, expiresAt),
        );

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

  async validateBookingForPayment(
    bookingRef: string,
    userId: number,
    options: { skipExpiryCheck?: boolean } = {},
  ) {
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

    if (
      !options.skipExpiryCheck &&
      booking.expiresAt &&
      new Date(booking.expiresAt) <= new Date()
    ) {
      throw new BadRequestException('Booking đã hết hạn thanh toán');
    }

    return {
      ...booking,
      bookingId: String(booking.bookingId),
      finalAmount: Number(booking.totalAmount),
    };
  }

  async expirePendingBookings(): Promise<{ expiredCount: number }> {
    const now = new Date();

    const rows = (await this.dataSource.query(
      `
        SELECT DISTINCT
          CONVERT(VARCHAR(30), bo.booking_id) AS booking_id
        FROM dbo.booking_orders AS bo
        INNER JOIN dbo.showtimes AS st
          ON st.showtime_id = bo.showtime_id
        OUTER APPLY (
          SELECT TOP (1)
            p.payment_method,
            p.payment_status
          FROM dbo.payments AS p
          WHERE p.booking_id = bo.booking_id
          ORDER BY p.created_at DESC, p.payment_id DESC
        ) AS latest_payment
        WHERE bo.status = 'PENDING_PAYMENT'
          AND (
            (
              (
                ISNULL(latest_payment.payment_method, '') <> 'CASH'
                OR ISNULL(latest_payment.payment_status, '') <> 'PENDING'
              )
              AND bo.expires_at IS NOT NULL
              AND bo.expires_at <= @1
            )
            OR (
              latest_payment.payment_method = 'CASH'
              AND latest_payment.payment_status = 'PENDING'
              AND DATEADD(MINUTE, @0, st.start_time) <= CAST(
                SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time'
                AS DATETIME2
              )
            )
          );
      `,
      [COUNTER_PAYMENT_GRACE_MINUTES, now],
    )) as Array<{ booking_id: string }>;

    const candidateIds = [...new Set(rows.map((row) => String(row.booking_id)))];
    let expiredCount = 0;

    for (const candidateId of candidateIds) {
      const expired = await this.dataSource.transaction(async (manager) => {
        const lockedRows = (await manager.query(
          `
            SELECT TOP (1)
              CONVERT(VARCHAR(30), bo.booking_id) AS booking_id,
              bo.user_id
            FROM dbo.booking_orders AS bo WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN dbo.showtimes AS st
              ON st.showtime_id = bo.showtime_id
            OUTER APPLY (
              SELECT TOP (1)
                p.payment_method,
                p.payment_status
              FROM dbo.payments AS p
              WHERE p.booking_id = bo.booking_id
              ORDER BY p.created_at DESC, p.payment_id DESC
            ) AS latest_payment
            WHERE bo.booking_id = @0
              AND bo.status = 'PENDING_PAYMENT'
              AND (
                (
                  (
                    ISNULL(latest_payment.payment_method, '') <> 'CASH'
                    OR ISNULL(latest_payment.payment_status, '') <> 'PENDING'
                  )
                  AND bo.expires_at IS NOT NULL
                  AND bo.expires_at <= @2
                )
                OR (
                  latest_payment.payment_method = 'CASH'
                  AND latest_payment.payment_status = 'PENDING'
                  AND DATEADD(MINUTE, @1, st.start_time) <= CAST(
                    SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time'
                    AS DATETIME2
                  )
                )
              );
          `,
          [candidateId, COUNTER_PAYMENT_GRACE_MINUTES, now],
        )) as Array<{ booking_id: string; user_id: number }>;

        const locked = lockedRows[0];
        if (!locked) return false;

        const bookingId = String(locked.booking_id);
        const userId = Number(locked.user_id);
        const details = await manager.find(BookingDetail, {
          where: { bookingId, status: 'ACTIVE' },
        });
        const seatIds = [...new Set(details.map((d) => d.showtimeSeatId))];

        await manager.update(
          BookingOrder,
          { bookingId, status: 'PENDING_PAYMENT' },
          { status: 'EXPIRED', cancelledAt: now },
        );
        await manager.update(
          Payment,
          { bookingId, paymentStatus: 'PENDING' },
          { paymentStatus: 'FAILED', failedReason: 'Booking expired' },
        );
        await manager.update(
          BookingDetail,
          { bookingId, status: 'ACTIVE' },
          { status: 'EXPIRED' },
        );

        await this.releaseBookingSeatsSafely(
          manager,
          bookingId,
          userId,
          seatIds,
          SeatHoldStatus.EXPIRED,
          now,
        );

        await manager.delete(BookingCombo, { bookingId });
        return true;
      });

      if (expired) expiredCount += 1;
    }

    return { expiredCount };
  }

  async getMyBookings(userId: number) {
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

  async getBookingTickets(bookingRef: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
      relations: {
        bookingDetails: {
          ticket: true,
          showtimeSeat: { seat: true } as any,
        } as any,
        showtime: { movie: true, room: { cinema: true } as any } as any,
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    const startTime = booking.showtime?.startTime
      ? new Date(booking.showtime.startTime)
      : null;

    return (booking.bookingDetails ?? [])
      .filter((detail) => Boolean(detail.ticket))
      .map((detail) => ({
        id: String(detail.ticket.ticketId),
        ticketId: String(detail.ticket.ticketId),
        ticketCode: detail.ticket.ticketCode,
        qrCode: detail.ticket.qrCode,
        ticketStatus: detail.ticket.ticketStatus,
        status: detail.ticket.ticketStatus,
        issuedAt: detail.ticket.issuedAt,
        checkedInAt: detail.ticket.checkedInAt,
        checkedInBy: detail.ticket.checkedInBy,
        orderCode: booking.bookingCode,
        movieTitle: booking.showtime?.movie?.title ?? 'Vé xem phim',
        seatCode:
          detail.showtimeSeat?.seat?.seatLabel ??
          `${detail.showtimeSeat?.seat?.seatRow ?? ''}${
            detail.showtimeSeat?.seat?.seatNumber ?? ''
          }`,
        seatName:
          detail.showtimeSeat?.seat?.seatLabel ??
          `${detail.showtimeSeat?.seat?.seatRow ?? ''}${
            detail.showtimeSeat?.seat?.seatNumber ?? ''
          }`,
        showDate: startTime
          ? startTime.toLocaleDateString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
            })
          : undefined,
        showTime: startTime
          ? startTime.toLocaleTimeString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
      }));
  }

  async getBookingDetail(bookingRef: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { ...this.buildBookingRef(bookingRef), userId },
      relations: {
        bookingDetails: { showtimeSeat: { seat: true } as any },
        showtime: { movie: true, room: { cinema: true } as any } as any,
        bookingCombos: { combo: true } as any,
      } as any,
      /*
       * Tách relation thành các truy vấn nhỏ, tránh JOIN booking_details ×
       * booking_combos tạo dữ liệu nhân chéo và làm trang thanh toán chậm.
       */
      relationLoadStrategy: 'query',
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async cancelBooking(bookingRef: string, userId: number) {
    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(BookingOrder, {
        where: { ...this.buildBookingRef(bookingRef), userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException('Không tìm thấy booking');
      }
      if (!canUserCancelBooking(booking.status)) {
        throw new BadRequestException('Booking không thể hủy ở trạng thái hiện tại');
      }

      const bookingId = String(booking.bookingId);
      const details = await manager.find(BookingDetail, {
        where: { bookingId, status: 'ACTIVE' },
      });
      const seatIds = [...new Set(details.map((d) => d.showtimeSeatId))];

      await manager.update(
        BookingOrder,
        { bookingId, status: 'PENDING_PAYMENT' },
        { status: 'CANCELLED', cancelledAt: now },
      );
      await manager.update(
        Payment,
        { bookingId, paymentStatus: 'PENDING' },
        { paymentStatus: 'FAILED', failedReason: 'Booking cancelled by user' },
      );
      await manager.update(
        BookingDetail,
        { bookingId, status: 'ACTIVE' },
        { status: 'CANCELLED' },
      );

      await this.releaseBookingSeatsSafely(
        manager,
        bookingId,
        booking.userId,
        seatIds,
        SeatHoldStatus.CANCELLED,
        now,
      );

      return { success: true };
    });
  }

  // ADMIN

  static readonly ADMIN_ALLOWED_STATUS = [
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PAID',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
  ];

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

  async adminUpdateStatus(bookingId: string, status: string) {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (!BookingService.ADMIN_ALLOWED_STATUS.includes(normalized)) {
      throw new BadRequestException(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${BookingService.ADMIN_ALLOWED_STATUS.join(', ')}`,
      );
    }

    const now = new Date();
    const previousStatus = await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(BookingOrder, {
        where: { bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) throw new NotFoundException('Không tìm thấy booking');
      if (booking.status === normalized) return booking.status;

      if (!canAdminTransitionBooking(booking.status, normalized)) {
        throw new BadRequestException(
          'Admin chỉ được chuyển đơn PENDING_PAYMENT sang CANCELLED hoặc EXPIRED. ' +
            'Đơn đã thanh toán phải đi qua luồng refund; xác nhận thanh toán phải đi qua PaymentService.',
        );
      }

      const details = await manager.find(BookingDetail, {
        where: { bookingId, status: 'ACTIVE' },
      });
      const seatIds = [...new Set(details.map((d) => d.showtimeSeatId))];
      const terminalHoldStatus =
        normalized === 'EXPIRED'
          ? SeatHoldStatus.EXPIRED
          : SeatHoldStatus.CANCELLED;

      await manager.update(
        BookingOrder,
        { bookingId, status: 'PENDING_PAYMENT' },
        { status: normalized, cancelledAt: now },
      );
      await manager.update(
        Payment,
        { bookingId, paymentStatus: 'PENDING' },
        {
          paymentStatus: 'FAILED',
          failedReason: `Booking marked ${normalized.toLowerCase()} by admin`,
        },
      );
      await manager.update(
        BookingDetail,
        { bookingId, status: 'ACTIVE' },
        { status: normalized === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' },
      );
      await this.releaseBookingSeatsSafely(
        manager,
        bookingId,
        booking.userId,
        seatIds,
        terminalHoldStatus,
        now,
      );

      return booking.status;
    });

    this.logger.log(
      `Admin đổi trạng thái booking #${bookingId}: ${previousStatus} -> ${normalized}`,
    );

    return this.bookingRepo.findOne({ where: { bookingId } });
  }

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
