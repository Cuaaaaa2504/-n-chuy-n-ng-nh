// src/booking/booking.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { Voucher } from '../entities/voucher.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
import {
  BookingResponse,
  CreateBookingRequest,
} from './dto';

@Injectable()
export class BookingService {
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

    const totalAmount = Math.max(0, subtotalAmount + productAmount - discountAmount);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    return this.dataSource.transaction(async (manager) => {
      // FIX [M-03]: thêm random suffix để tránh bookingCode trùng khi 2 request đến cùng millisecond
      const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const booking = manager.create(BookingOrder, {
        bookingCode: `BK-${Date.now()}-${randomSuffix}`,
        userId,
        showtimeId,
        promotionId: appliedPromotionId,
        subtotalAmount,
        discountAmount,
        productAmount,
        totalAmount,
        status: 'PENDING_PAYMENT',
        expiresAt,
      });
      await manager.save(BookingOrder, booking);

      const savedBookingId = booking.bookingId;

      const details = holds.map((hold) =>
        manager.create(BookingDetail, {
          bookingId: savedBookingId,
          showtimeSeatId: hold.showtimeSeat.showtimeSeatId,
          seatPrice: hold.showtimeSeat.price,
          status: 'ACTIVE',
        }),
      );
      await manager.save(BookingDetail, details);

      if (requestedProducts.length) {
        const combos = requestedProducts.map((item) => {
          const product = products.find((p) => p.comboId === item.productId)!;
          return manager.create(BookingCombo, {
            bookingId: savedBookingId,
            comboId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
          });
        });
        await manager.save(BookingCombo, combos);
      }

      await manager.update(SeatHold, { holdId: In(request.holdIds) }, { status: 'CONVERTED' });

      // FIX [H-02]: tăng usedCount của voucher sau khi booking thành công
      if (request.voucherCode && appliedPromotionId) {
        await manager.increment(Voucher, { promotionId: appliedPromotionId }, 'usedCount', 1);
      }

      return {
        bookingId: savedBookingId,
        bookingCode: booking.bookingCode,
        showtimeId,
        seatCount: holds.length,
        subtotalAmount,
        productAmount,
        discountAmount,
        totalAmount,
        status: 'PENDING_PAYMENT',
        expiresAt,
      } satisfies BookingResponse;
    });
  }

  async validateBookingForPayment(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
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

      if (allSeatIds.length) {
        await manager.update(
          ShowtimeSeat,
          { showtimeSeatId: In(allSeatIds) },
          { status: 'AVAILABLE', holdExpiresAt: null, heldByUserId: null },
        );

        await manager.update(
          SeatHold,
          { showtimeSeatId: In(allSeatIds), status: 'ACTIVE' },
          { status: 'EXPIRED', releasedAt: now },
        );
      }

      if (bookingIds.length) {
        await manager.delete(BookingCombo, { bookingId: In(bookingIds) });
      }
    });

    return { expiredCount: expiredBookings.length };
  }

  async getMyBookings(userId: number) {
    return this.bookingRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Lấy chi tiết booking kèm thông tin vé — dùng cho GET :id/tickets */
  async getBookingTickets(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
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

  async getBookingDetail(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
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

  async cancelBooking(bookingId: string, userId: number) {
    const now = new Date();

    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
      relations: { bookingDetails: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Booking không thể hủy ở trạng thái hiện tại');
    }

    const showtimeSeatIds = booking.bookingDetails.map((d: any) => d.showtimeSeatId);

    // FIX [C-01]: bỜ cancelBooking trong transaction — nếu một bước fail,
    // toàn bộ rollback tránh trường hợp booking CANCELLED nhưng ghế vẫn HELD
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        BookingOrder,
        { bookingId },
        { status: 'CANCELLED', cancelledAt: now },
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
          { showtimeSeatId: In(showtimeSeatIds), status: In(['ACTIVE', 'CONVERTED']) },
          { status: 'RELEASED', releasedAt: now },
        );
      }
    });

    return { success: true };
  }
}
