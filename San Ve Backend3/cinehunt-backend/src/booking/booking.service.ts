// src/booking/booking.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { Payment } from '../entities/payment.entity';
import { Voucher } from '../entities/voucher.entity';
import { Combo } from '../entities/combo.entity';
import { BookingCombo } from '../entities/booking-combo.entity';
import {
  BookingResponse,
  CreateBookingRequest,
} from './dto';
import { v4 as uuidv4 } from 'uuid';

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
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(Combo)
    private readonly productRepo: Repository<Combo>,
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
    const bookingId = uuidv4();

    return this.dataSource.transaction(async (manager) => {
      const booking = manager.create(BookingOrder, {
        bookingId,
        bookingCode: `BK-${Date.now()}`,
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

      const details = holds.map((hold) =>
        manager.create(BookingDetail, {
          bookingId,
          showtimeSeatId: hold.showtimeSeat.showtimeSeatId,
          seatPrice: hold.showtimeSeat.price,
          status: 'PENDING',
        }),
      );
      await manager.save(BookingDetail, details);

      if (requestedProducts.length) {
        const combos = requestedProducts.map((item) => {
          const product = products.find((p) => p.comboId === item.productId)!;
          return manager.create(BookingCombo, {
            bookingId,
            comboId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
          });
        });
        await manager.save(BookingCombo, combos);
      }

      await manager.update(SeatHold, { holdId: In(request.holdIds) }, { status: 'CONVERTED' });

      return {
        bookingId,
        bookingCode: booking.bookingCode,
        totalAmount,
        expiresAt: expiresAt.toISOString(),
        status: 'PENDING_PAYMENT',
      };
    });
  }

  async getMyBookings(userId: number) {
    return this.bookingRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
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

    if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
      throw new BadRequestException('Booking đã hết hạn');
    }

    return {
      ...booking,
      finalAmount: Number(booking.totalAmount),
    };
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

    if (booking.status === 'PAID') {
      throw new BadRequestException('Không thể hủy booking đã thanh toán');
    }

    await this.bookingRepo.update({ bookingId }, { status: 'CANCELLED', cancelledAt: new Date() });

    const showtimeSeatIds = booking.bookingDetails.map((d: any) => d.showtimeSeatId);
    if (showtimeSeatIds.length) {
      await this.showtimeSeatRepo.update(
        { showtimeSeatId: In(showtimeSeatIds) },
        { status: 'AVAILABLE' },
      );
    }

    return { message: 'Hủy booking thành công', bookingId };
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

  // FIX: Thêm method cho route GET /bookings/:id/tickets (MyTicketsPage)
  async getBookingTickets(bookingId: string, userId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
      relations: {
        bookingDetails: {
          showtimeSeat: { seat: true },
          ticket: true,
        },
      } as any,
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    return booking.bookingDetails.map((detail: any) => ({
      bookingDetailId: detail.bookingDetailId,
      seatPrice: Number(detail.seatPrice),
      status: detail.status,
      seatRow: detail.showtimeSeat?.seat?.seatRow ?? null,
      seatNumber: detail.showtimeSeat?.seat?.seatNumber ?? null,
      seatLabel: detail.showtimeSeat?.seat?.seatLabel ?? null,
      ticketId: detail.ticket?.ticketId ?? null,
      qrCode: detail.ticket?.qrCode ?? null,
    }));
  }
}
