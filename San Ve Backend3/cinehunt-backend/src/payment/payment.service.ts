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

  async createPayment(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const booking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
    );

    const existingPending =
      await this.paymentRepository.findPendingByBookingId(String(dto.bookingId));
    if (existingPending) {
      throw new BadRequestException('Booking đã có payment đang chờ xử lý');
    }

    const transactionCode = this.paymentRepository.generatePaymentCode();

    const payment = await this.paymentRepository.createPayment({
      booking_id: String(booking.booking_id) as any,
      payment_method: dto.paymentMethod,
      provider: dto.provider ?? null,
      amount: booking.final_amount,
      transaction_code: transactionCode,
      payment_status: 'PENDING',
      provider_response: null,
      paid_at: null,
    } as any);

    return {
      paymentId: payment.payment_id,
      bookingId: payment.booking_id,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      paymentStatus: payment.payment_status,
      transactionCode: payment.transaction_code,
      createdAt: payment.created_at,
    };
  }

  async processPaymentSuccess(paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { payment_id: paymentId },
      });

      if (!payment) throw new NotFoundException('Không tìm thấy payment');

      if (payment.payment_status !== 'PENDING') {
        throw new BadRequestException(
          `Payment status là ${payment.payment_status}, chỉ PENDING mới được xử lý`,
        );
      }

      const booking = await this.bookingService.validateBookingForPayment(
        payment.booking_id as any,
      );

      const bookingDetails =
        await this.paymentRepository.getBookingDetailsByBookingId(
          payment.booking_id,
        );

      if (!bookingDetails.length) {
        throw new BadRequestException('Không tìm thấy ghế trong booking');
      }

      await queryRunner.manager.update(Payment, paymentId, {
        payment_status: 'SUCCESS',
        paid_at: new Date(),
      });

      const seatIds = bookingDetails.map((d) => d.showtime_seat_id);

      await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({
          status: 'SOLD',
          hold_expires_at: null,
          held_by_user_id: null,
        })
        .where('showtime_seat_id IN (:...ids)', { ids: seatIds })
        .execute();

      await this.bookingService.updateBookingToPaid(booking.booking_id);

      const tickets: any[] = [];

      for (const detail of bookingDetails) {
        const existing = await this.paymentRepository.findTicketByDetailId(
          String(detail.booking_detail_id),
        );

        if (existing) {
          tickets.push({
            ticketId: existing.ticket_id,
            ticketCode: existing.ticket_code,
            qrCode: existing.qr_code,
            seatLabel: detail.showtime_seat?.seat
              ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
              : null,
            seatType: detail.showtime_seat?.seat?.seat_type ?? null,
            price: Number(detail.seat_price),
          });
          continue;
        }

        const newTicket = await this.paymentRepository.createTicket({
          booking_detail_id: String(detail.booking_detail_id) as any,
          ticket_code: this.paymentRepository.generateTicketCode(),
          qr_code: this.paymentRepository.generateQrCode(),
          ticket_status: 'VALID',
          issued_at: new Date(),
          checked_in_at: null,
          checked_in_by: null,
        } as any);

        tickets.push({
          ticketId: newTicket.ticket_id,
          ticketCode: newTicket.ticket_code,
          qrCode: newTicket.qr_code,
          seatLabel: detail.showtime_seat?.seat
            ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
            : null,
          seatType: detail.showtime_seat?.seat?.seat_type ?? null,
          price: Number(detail.seat_price),
        });
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        paymentId,
        bookingId: booking.booking_id,
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

    if (payment.payment_status !== 'PENDING') {
      throw new BadRequestException(
        `Payment status là ${payment.payment_status}, chỉ PENDING mới được hủy`,
      );
    }

    await this.paymentRepository.updatePaymentFailed(
      paymentId,
      'Payment failed by system',
    );

    // cancelBooking nhận bookingId dạng string (BIGINT)
    await this.bookingService.cancelBooking(payment.booking_id, undefined as any);

    return { success: true, paymentId, status: 'FAILED' };
  }

  async getPaymentByBookingId(bookingId: string) {
    const payment = await this.paymentRepository.findLatestByBookingId(bookingId);

    if (!payment) throw new NotFoundException('Không tìm thấy payment của booking');

    return {
      paymentId: payment.payment_id,
      bookingId: payment.booking_id,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      paymentStatus: payment.payment_status,
      transactionCode: payment.transaction_code,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  }
}
