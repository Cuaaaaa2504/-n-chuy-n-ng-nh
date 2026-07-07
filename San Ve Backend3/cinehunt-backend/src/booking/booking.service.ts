import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
import { Voucher } from '../entities/voucher.entity';
import { CreateBookingRequest, BookingResponse } from './dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingOrder)
    private readonly bookingRepo: Repository<BookingOrder>,
    @InjectRepository(BookingDetail)
    private readonly bookingDetailRepo: Repository<BookingDetail>,
    @InjectRepository(SeatHold)
    private readonly holdRepo: Repository<SeatHold>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepo: Repository<ShowtimeSeat>,
    @InjectRepository(ConcessionCombo)
    private readonly productRepo: Repository<ConcessionCombo>,
    @InjectRepository(BookingCombo)
    private readonly bookingProductRepo: Repository<BookingCombo>,
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  async createBooking(userId: number, request: CreateBookingRequest): Promise<BookingResponse> {
    const now = new Date();

    const holds = await this.holdRepo.find({
      where: {
        holdId: In(request.holdIds),
        userId,
        status: 'ACTIVE',
      },
      relations: { showtimeSeat: true },
    });

    if (holds.length !== request.holdIds.length) {
      throw new BadRequestException('Một hoặc nhiều hold không hợp lệ');
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

    const requestedProducts = request.products ?? [];
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

      if (!voucher) {
        throw new BadRequestException(`Voucher '${request.voucherCode}' không tồn tại`);
      }

      const now2 = new Date();
      if (now2 < voucher.startAt) throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
      if (now2 > voucher.endAt) throw new BadRequestException('Voucher đã hết hạn');
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
        throw new BadRequestException('Voucher đã hết lượt sử dụng');

      const orderTotal = subtotalAmount + productAmount;
      if (voucher.minOrderAmount && orderTotal < Number(voucher.minOrderAmount))
        throw new BadRequestException(
          `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ để dùng voucher này`,
        );

      if (voucher.discountType === 'PERCENT') {
        discountAmount = (orderTotal * Number(voucher.discountValue)) / 100;
        if (voucher.maxDiscount)
          discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
      } else {
        discountAmount = Number(voucher.discountValue);
      }
      discountAmount = Math.round(discountAmount);
      appliedPromotionId = voucher.promotionId;
    }

    const totalAmount = subtotalAmount + productAmount - discountAmount;
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const bookingCode = `BK${Date.now()}`;

    return this.dataSource.transaction(async (manager) => {
      const booking = manager.create(BookingOrder, {
        bookingCode,
        userId,
        showtimeId,
        promotionId: appliedPromotionId,
        subtotalAmount,
        productAmount,
        discountAmount,
        totalAmount,
        status: 'PENDING_PAYMENT',
        idempotencyKey: request.idempotencyKey ?? null,
        expiresAt,
      });

      const savedBooking = await manager.save(BookingOrder, booking);

      const details = holds.map((hold) =>
        manager.create(BookingDetail, {
          bookingId: savedBooking.bookingId,
          showtimeSeatId: hold.showtimeSeatId,
          seatPrice: Number(hold.showtimeSeat.price),
          status: 'ACTIVE',
        }),
      );
      await manager.save(BookingDetail, details);

      if (requestedProducts.length > 0) {
        const bookingProducts = requestedProducts.map((item) => {
          const product = products.find((p) => p.comboId === item.productId)!;
          return manager.create(BookingCombo, {
            bookingId: savedBooking.bookingId,
            comboId: product.comboId,
            quantity: item.quantity,
            unitPrice: Number(product.price),
          });
        });
        await manager.save(BookingCombo, bookingProducts);
      }

      if (request.voucherCode && appliedPromotionId) {
        await manager.increment(Voucher, { promotionId: appliedPromotionId }, 'usedCount', 1);
      }

      for (const hold of holds) {
        await manager.update(SeatHold, { holdId: hold.holdId }, { status: 'CONFIRMED' });
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: hold.showtimeSeatId },
          {
            status: 'HELD',
            heldByUserId: userId,
            holdExpiresAt: expiresAt,
          },
        );
      }

      return {
        bookingId: savedBooking.bookingId,
        bookingCode: savedBooking.bookingCode,
        showtimeId,
        seatCount: holds.length,
        subtotalAmount,
        productAmount,
        discountAmount,
        totalAmount,
        status: savedBooking.status,
        expiresAt,
      };
    });
  }

  async getMyBookings(userId: number) {
    const bookings = await this.bookingRepo.find({
      where: { userId },
      relations: {
        bookingDetails: {
          showtimeSeat: {
            seat: true,
            showtime: { movie: true, room: { cinema: true } as any } as any,
          } as any,
        } as any,
        payments: true,
      } as any,
      order: { createdAt: 'DESC' },
    });

    return bookings.map((b) => {
      const firstDetail = b.bookingDetails?.[0];
      const showtimeSeat = firstDetail?.showtimeSeat as any;
      const showtime = showtimeSeat?.showtime as any;
      const movie = showtime?.movie as any;
      const room = showtime?.room as any;
      const cinema = room?.cinema as any;

      const seatCodes = (b.bookingDetails ?? []).map((d) => {
        const ss = (d.showtimeSeat as any)?.seat;
        return ss ? `${ss.rowName ?? ss.seatRow ?? ''}${ss.seatNumber ?? ''}` : '';
      }).filter(Boolean);

      return {
        bookingId: b.bookingId,
        bookingCode: b.bookingCode,
        movieTitle: movie?.title ?? 'Vé xem phim',
        cinemaName: cinema?.name ?? null,
        roomName: room?.name ?? null,
        showDate: showtime?.showDate
          ? new Date(showtime.showDate).toLocaleDateString('vi-VN')
          : null,
        showTime: showtime?.startTime ?? null,
        seatCodes,
        totalAmount: Number(b.totalAmount ?? 0),
        status: b.status,
        expiresAt: b.expiresAt ?? null,
        paidAt: b.paidAt ?? null,
      };
    });
  }

  async getBookingDetail(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
      relations: {
        bookingDetails: { showtimeSeat: { seat: true } as any },
        payments: true,
        bookingCombos: { combo: true } as any,
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, userId: number) {
    if (userId === undefined || userId === null) {
      throw new BadRequestException('userId không hợp lệ khi hủy booking');
    }

    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
      relations: { bookingDetails: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (!['PENDING_PAYMENT', 'FAILED'].includes(booking.status)) {
      throw new BadRequestException('Booking không thể hủy ở trạng thái hiện tại');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(
        BookingOrder,
        { bookingId },
        { status: 'CANCELLED', cancelledAt: new Date() },
      );

      for (const detail of booking.bookingDetails) {
        await manager.update(
          BookingDetail,
          { bookingDetailId: detail.bookingDetailId },
          { status: 'CANCELLED' },
        );
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: detail.showtimeSeatId },
          { status: 'AVAILABLE', heldByUserId: null, holdExpiresAt: null },
        );
      }

      return { success: true, bookingId };
    });
  }

  async expirePendingBookings() {
    const now = new Date();
    const bookings = await this.bookingRepo.find({
      where: { status: 'PENDING_PAYMENT' },
      relations: { bookingDetails: true },
    });
    const targets = bookings.filter((b) => b.expiresAt && new Date(b.expiresAt) <= now);

    let expiredCount = 0;
    for (const booking of targets) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          BookingOrder,
          { bookingId: booking.bookingId },
          { status: 'EXPIRED', cancelledAt: now },
        );

        for (const detail of booking.bookingDetails) {
          await manager.update(
            BookingDetail,
            { bookingDetailId: detail.bookingDetailId },
            { status: 'EXPIRED' },
          );
          await manager.update(
            ShowtimeSeat,
            { showtimeSeatId: detail.showtimeSeatId },
            { status: 'AVAILABLE', heldByUserId: null, holdExpiresAt: null },
          );
        }
      });
      expiredCount++;
    }

    return { expiredCount };
  }

  async validateBookingForPayment(bookingId: number | string, userId?: number) {
    const booking = await this.bookingRepo.findOne({
      where: {
        bookingId: String(bookingId),
        ...(userId !== undefined ? { userId } : {}),
      },
      relations: { bookingDetails: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
    }

    if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
      throw new BadRequestException('Booking đã hết hạn');
    }

    return {
      ...booking,
      finalAmount: Number(booking.totalAmount),
    };
  }

  async updateBookingToPaid(bookingId: string) {
    await this.bookingRepo.update(
      { bookingId },
      {
        status: 'PAID',
        paidAt: new Date(),
        issuedAt: new Date(),
      },
    );
  }
}
