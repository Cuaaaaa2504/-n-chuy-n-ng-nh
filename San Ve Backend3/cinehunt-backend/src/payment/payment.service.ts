import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
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

    const existingPending = await this.paymentRepository.findPendingByBookingId(
      String(dto.bookingId),
    );
    if (existingPending) {
      throw new BadRequestException('Booking đã có payment đang chờ xử lý');
    }

    const transactionCode = this.paymentRepository.generatePaymentCode();

    const payment = await this.paymentRepository.createPayment({
      bookingId: String(booking.bookingId),
      paymentMethod: dto.paymentMethod,
      provider: dto.provider ?? null,
      amount: booking.finalAmount,
      transactionCode,
      paymentStatus: 'PENDING',
      providerResponse: null,
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

      const booking = await this.bookingService.validateBookingForPayment(
        payment.bookingId,
      );

      const bookingDetails = await this.paymentRepository.getBookingDetailsByBookingId(
        payment.bookingId,
      );

      if (!bookingDetails.length) {
        throw new BadRequestException('Không tìm thấy ghế trong booking');
      }

      await queryRunner.manager.update(Payment, { paymentId }, {
        paymentStatus: 'SUCCESS',
        paidAt: new Date(),
      });

      const seatIds = bookingDetails.map((d) => d.showtimeSeatId);

      await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: 'SOLD', holdExpiresAt: null, heldByUserId: null })
        .where('showtimeSeatId IN (:...ids)', { ids: seatIds })
        .execute();

      await this.bookingService.updateBookingToPaid(booking.bookingId);

      const tickets: any[] = [];

      for (const detail of bookingDetails) {
        const existing = await this.paymentRepository.findTicketByDetailId(
          String(detail.bookingDetailId),
        );

        if (existing) {
          tickets.push({
            ticketId: existing.ticketId,
            ticketCode: existing.ticketCode,
            qrCode: existing.qrCode,
            seatLabel: detail.showtimeSeat?.seat
              ? `${detail.showtimeSeat.seat.seatRow}${detail.showtimeSeat.seat.seatNumber}`
              : null,
            seatType: detail.showtimeSeat?.seat?.seatType ?? null,
            price: Number(detail.seatPrice),
          });
          continue;
        }

        const newTicket = await this.paymentRepository.createTicket({
          bookingDetailId: String(detail.bookingDetailId),
          ticketCode: this.paymentRepository.generateTicketCode(),
          qrCode: this.paymentRepository.generateQrCode(),
          ticketStatus: 'VALID',
          issuedAt: new Date(),
          checkedInAt: null,
          checkedInBy: null,
        });

        tickets.push({
          ticketId: newTicket.ticketId,
          ticketCode: newTicket.ticketCode,
          qrCode: newTicket.qrCode,
          seatLabel: detail.showtimeSeat?.seat
            ? `${detail.showtimeSeat.seat.seatRow}${detail.showtimeSeat.seat.seatNumber}`
            : null,
          seatType: detail.showtimeSeat?.seat?.seatType ?? null,
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

    if (payment.paymentStatus !== 'PENDING') {
      throw new BadRequestException(
        `Payment status là ${payment.paymentStatus}, chỉ PENDING mới được hủy`,
      );
    }

    await this.paymentRepository.updatePaymentFailed(paymentId, 'Payment failed by system');
    await this.bookingService.cancelBooking(payment.bookingId, undefined as any);

    return { success: true, paymentId, status: 'FAILED' };
  }

  async getPaymentByBookingId(bookingId: string) {
    const payment = await this.paymentRepository.findLatestByBookingId(bookingId);

    if (!payment) throw new NotFoundException('Không tìm thấy payment của booking');

    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      transactionCode: payment.transactionCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }
}
