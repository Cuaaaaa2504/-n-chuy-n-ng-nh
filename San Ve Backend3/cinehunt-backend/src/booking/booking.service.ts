import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
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
  ) {}

  async createBooking(userId: number, request: CreateBookingRequest): Promise<BookingResponse> {
    const now = new Date();

    const holds = await this.holdRepo.find({
      where: {
        hold_id: In(request.holdIds.map((x) => String(x))),
        user_id: userId,
        status: 'ACTIVE',
      },
      relations: { showtime_seat: true },
    });

    if (holds.length !== request.holdIds.length) {
      throw new BadRequestException('Một hoặc nhiều hold không hợp lệ');
    }

    if (holds.some((h) => new Date(h.expires_at) <= now)) {
      throw new BadRequestException('Có hold đã hết hạn');
    }

    const distinctShowtimeIds = [...new Set(holds.map((h) => h.showtime_seat.showtime_id))];
    if (distinctShowtimeIds.length !== 1) {
      throw new BadRequestException('Các ghế phải thuộc cùng một suất chiếu');
    }

    const showtimeId = distinctShowtimeIds[0];
    const subtotalAmount = holds.reduce((sum, h) => sum + Number(h.showtime_seat.price), 0);

    const requestedProducts = request.products ?? [];
    const productIds = requestedProducts.map((p) => p.productId);
    const products = productIds.length
      ? await this.productRepo.find({ where: { product_id: In(productIds), status: 'ACTIVE' } })
      : [];

    if (products.length !== productIds.length) {
      throw new BadRequestException('Có sản phẩm không tồn tại hoặc không hoạt động');
    }

    const productAmount = requestedProducts.reduce((sum, item) => {
      const product = products.find((p) => p.product_id === item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);

    const discountAmount = 0;
    const totalAmount = subtotalAmount + productAmount - discountAmount;
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const bookingCode = `BK${Date.now()}`;

    return this.dataSource.transaction(async (manager) => {
      const booking = manager.create(BookingOrder, {
        booking_code: bookingCode,
        user_id: userId,
        showtime_id: showtimeId,
        promotion_id: request.promotionId ?? null,
        subtotal_amount: subtotalAmount,
        product_amount: productAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: 'PENDING_PAYMENT',
        idempotency_key: request.idempotencyKey ?? null,
        expires_at: expiresAt,
      });

      const savedBooking = await manager.save(BookingOrder, booking);

      const details = holds.map((hold) =>
        manager.create(BookingDetail, {
          booking_id: savedBooking.booking_id,
          showtime_seat_id: hold.showtime_seat_id,
          seat_price: Number(hold.showtime_seat.price),
          status: 'ACTIVE',
        }),
      );
      await manager.save(BookingDetail, details);

      if (requestedProducts.length > 0) {
        const bookingProducts = requestedProducts.map((item) => {
          const product = products.find((p) => p.product_id === item.productId)!;
          return manager.create(BookingCombo, {
            booking_id: savedBooking.booking_id,
            product_id: product.product_id,
            quantity: item.quantity,
            unit_price: Number(product.price),
          });
        });
        await manager.save(BookingCombo, bookingProducts);
      }

      for (const hold of holds) {
        await manager.update(SeatHold, { hold_id: hold.hold_id }, { status: 'CONFIRMED' });
        await manager.update(
          ShowtimeSeat,
          { showtime_seat_id: hold.showtime_seat_id },
          {
            status: 'HELD',
            held_by_user_id: userId,
            hold_expires_at: expiresAt,
          },
        );
      }

      return {
        bookingId: savedBooking.booking_id,
        bookingCode: savedBooking.booking_code,
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

  async getBookingDetail(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { booking_id: bookingId, user_id: userId },
      relations: {
        booking_details: { showtime_seat: { seat: true } as any },
        payments: true,
        booking_products: { product: true } as any,
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { booking_id: bookingId, user_id: userId },
      relations: { booking_details: true },
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
        { booking_id: bookingId },
        { status: 'CANCELLED', cancelled_at: new Date() },
      );

      for (const detail of booking.booking_details) {
        await manager.update(
          BookingDetail,
          { booking_detail_id: detail.booking_detail_id },
          { status: 'CANCELLED' },
        );
        await manager.update(
          ShowtimeSeat,
          { showtime_seat_id: detail.showtime_seat_id },
          { status: 'AVAILABLE', held_by_user_id: null, hold_expires_at: null },
        );
      }

      return { success: true, bookingId };
    });
  }

  async expirePendingBookings() {
    const now = new Date();
    const bookings = await this.bookingRepo.find({
      where: { status: 'PENDING_PAYMENT' as any },
      relations: { booking_details: true },
    });
    const targets = bookings.filter((b) => b.expires_at && new Date(b.expires_at) <= now);

    for (const booking of targets) {
      await this.cancelBooking(booking.booking_id, booking.user_id);
      await this.bookingRepo.update(
        { booking_id: booking.booking_id },
        { status: 'EXPIRED', cancelled_at: now },
      );
    }

    return { expiredCount: targets.length };
  }

  async validateBookingForPayment(bookingId: number | string, userId?: number) {
    const booking = await this.bookingRepo.findOne({
      where: {
        booking_id: String(bookingId),
        ...(userId ? { user_id: userId } : {}),
      } as any,
      relations: { booking_details: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
    }

    if (booking.expires_at && new Date(booking.expires_at) <= new Date()) {
      throw new BadRequestException('Booking đã hết hạn');
    }

    return {
      ...booking,
      final_amount: Number(booking.total_amount),
    } as any;
  }

  async updateBookingToPaid(bookingId: string) {
    await this.bookingRepo.update(
      { booking_id: bookingId },
      {
        status: 'PAID',
        paid_at: new Date(),
        issued_at: new Date(),
      } as any,
    );
  }
}
