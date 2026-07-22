import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { BookingService } from '../booking/booking.service';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto, PaymentResponse } from './dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly dataSource: DataSource,
  ) {}

  async createPayment(userId: number, dto: CreatePaymentDto): Promise<PaymentResponse> {
    const booking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
    );

    // FIX [bookingId must be a UUID]: dto.bookingId có thể là bookingCode (BK-xxx).
    // Từ đây trở đi chỉ dùng ID số đã được BookingService phân giải, nếu không
    // findPendingByBookingId sẽ so sánh nhầm chuỗi với cột BIGINT -> luôn miss
    // (tạo trùng payment PENDING) hoặc ném lỗi convert ở tầng driver.
    const bookingId = String(booking.bookingId);

    const existingPending =
      await this.paymentRepository.findPendingByBookingId(bookingId);
    if (existingPending) {
      throw new BadRequestException('Booking đã có payment đang chờ xử lý');
    }

    const transactionCode = this.paymentRepository.generatePaymentCode();

    const payment = await this.paymentRepository.createPayment({
      bookingId,
      paymentMethod: dto.paymentMethod,
      provider: dto.provider ?? null,
      amount: booking.finalAmount,
      transactionCode,
      paymentStatus: 'PENDING',
      providerResponse: null,
      failedReason: null,
      paidAt: null,
    });

    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      transactionCode: payment.transactionCode,
      createdAt: payment.createdAt,
    };
  }

  async processPaymentSuccess(paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { paymentId },
      });

      if (!payment) throw new NotFoundException('Không tìm thấy payment');

      if (payment.paymentStatus !== 'PENDING') {
        throw new BadRequestException(
          `Payment status là ${payment.paymentStatus}, chỉ PENDING mới được xử lý`,
        );
      }

      // FIX: validate booking bên trong transaction thông qua queryRunner
      const booking = await queryRunner.manager.findOne(BookingOrder, {
        where: { bookingId: payment.bookingId },
        relations: { bookingDetails: true },
      });

      if (!booking) throw new NotFoundException('Không tìm thấy booking');
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
      }

      if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
        throw new BadRequestException('Booking đã hết hạn');
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

      // Update payment thành SUCCESS
      await queryRunner.manager.update(Payment, { paymentId }, {
        paymentStatus: 'SUCCESS',
        failedReason: null,
        paidAt: new Date(),
      });

      const seatIds = bookingDetails.map((d) => d.showtimeSeatId);

      // Đánh dấu ghế là SOLD
      await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: 'SOLD', holdExpiresAt: null, heldByUserId: null })
        .where('showtime_seat_id IN (:...ids)', { ids: seatIds })
        .execute();

      // Booking và vé cùng nằm trong transaction; lỗi ở bước tạo vé sẽ rollback.
      // FIX BUG-01: status phải là 'PAID' (không phải 'ISSUED').
      // Toàn bộ frontend (MyTicketsPage.PAID_STATUSES, MyBookingsPage, nút "Xem QR vé")
      // và admin.service.PAID_STATUSES đều chỉ nhận dạng 'PAID'/'CONFIRMED'.
      // Đặt 'ISSUED' khiến vé không bao giờ hiện ở tab "Vé đã mua".
      // issuedAt vẫn được set để ghi nhận thời điểm xuất vé.
      await queryRunner.manager.update(
        BookingOrder,
        { bookingId: booking.bookingId },
        { status: 'PAID', paidAt: new Date(), issuedAt: new Date() },
      );

      await queryRunner.manager.update(
        SeatHold,
        {
          showtimeSeatId: In(seatIds),
          status: In([SeatHoldStatus.ACTIVE, SeatHoldStatus.CONVERTED]),
        },
        { status: SeatHoldStatus.CONFIRMED, releasedAt: new Date() },
      );

      // FIX BUG-06: tạo/đọc ticket bằng queryRunner.manager thay vì paymentRepository.
      // paymentRepository dùng Repository riêng -> nằm NGOÀI transaction: nếu
      // commitTransaction() thất bại, ticket đã insert vẫn tồn tại trong DB trong khi
      // booking bị rollback về PENDING_PAYMENT -> dữ liệu không nhất quán.
      // Dùng queryRunner.manager để ticket cùng sống/chết với transaction.
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

    // FIX: lấy userId từ booking thay vì truyền undefined
    const booking = await this.dataSource.getRepository(BookingOrder).findOne({
      where: { bookingId: payment.bookingId },
    });

    await this.paymentRepository.updatePaymentFailed(paymentId, 'Payment failed by system');

    if (booking?.status === 'PENDING_PAYMENT') {
      await this.bookingService.cancelBooking(payment.bookingId, booking.userId);
    }

    return { success: true, idempotent: false, paymentId, status: 'FAILED' };
  }

  async getPaymentByBookingId(bookingId: string) {
    // FIX: payments.booking_id là BIGINT. Nếu client gửi bookingCode (BK-xxx) vào
    // đây, TypeORM sẽ sinh câu SQL so sánh varchar với bigint -> lỗi convert (500).
    // Chặn sớm bằng 400 có thông báo rõ ràng.
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
}
