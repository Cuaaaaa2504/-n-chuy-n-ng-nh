// src/modules/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsRepository } from './payments.repository';
import { BookingsService } from '../bookings/bookings.service';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { Payment } from '../../database/entities/payment.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private paymentsRepository: PaymentsRepository,
    private bookingsService: BookingsService,
    private showtimesService: ShowtimesService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    // Validate booking exists and is in PENDING_PAYMENT status
    const booking = await this.bookingsService.validateBookingForPayment(
      createPaymentDto.bookingId,
    );

    // Check if payment already exists for this booking
    const existingPayment = await this.paymentsRepository.findPaymentById(
      createPaymentDto.bookingId,
    );
    if (existingPayment && existingPayment.payment_status === 'PENDING') {
      throw new BadRequestException('Payment already exists for this booking');
    }

    // Create payment
    const paymentCode = this.paymentsRepository.generatePaymentCode();
    const payment = await this.paymentsRepository.createPayment({
      booking_id: createPaymentDto.bookingId,
      payment_method: createPaymentDto.paymentMethod,
      amount: booking.final_amount,
      transaction_code: paymentCode,
      payment_status: 'PENDING',
    });

    return {
      paymentId: payment.payment_id,
      paymentCode: paymentCode,
      bookingId: booking.booking_id,
      amount: booking.final_amount,
      status: 'PENDING',
    };
  }

  async processPaymentSuccess(paymentId: number): Promise<{
    message: string;
    bookingStatus: string;
    ticketCount: number;
    tickets: any[];
  }> {
    // Get payment
    const payment = await this.paymentsRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== 'PENDING') {
      throw new BadRequestException(
        `Payment status is ${payment.payment_status}, only PENDING can be processed`,
      );
    }

    // Get booking
    const booking = await this.bookingsService.validateBookingForPayment(
      payment.booking_id,
    );

    // Get all booking details (seats)
    const bookingDetails = await this.paymentsRepository.getBookingDetailsByBookingId(
      payment.booking_id,
    );

    if (bookingDetails.length === 0) {
      throw new BadRequestException('No seats found for this booking');
    }

    const showtimeSeatIds = bookingDetails.map(d => d.showtime_seat_id);

    // Update payment to SUCCESS
    await this.paymentsRepository.updatePaymentStatus(
      paymentId,
      'SUCCESS',
      new Date(),
      payment.transaction_code,
    );

    // Update booking to PAID
    await this.bookingsService.updateBookingToPaid(payment.booking_id);

    // Update seats to SOLD
    await this.showtimesService.updateSeatsToSold(showtimeSeatIds);

    // Generate tickets for each seat
    const tickets = [];
    for (const detail of bookingDetails) {
      // Check if ticket already exists
      const exists = await this.paymentsRepository.checkExistingTicket(
        detail.booking_detail_id,
      );
      if (exists) {
        continue;
      }

      const ticketCode = this.paymentsRepository.generateTicketCode();
      const qrCode = this.paymentsRepository.generateQrCode();

      const ticket = await this.paymentsRepository.createTicket({
        booking_detail_id: detail.booking_detail_id,
        ticket_code: ticketCode,
        qr_code: qrCode,
        ticket_status: 'VALID',
        issued_at: new Date(),
      });

      // Get seat info
      const seatInfo = detail.showtimeSeat?.seat;
      tickets.push({
        ticketId: ticket.ticket_id,
        ticketCode: ticketCode,
        qrCode: qrCode,
        seatLabel: seatInfo ? `${seatInfo.seat_row}${seatInfo.seat_number}` : null,
        seatType: seatInfo?.seat_type,
        price: detail.seat_price,
      });
    }

    // Update booking to ISSUED
    await this.bookingsService.updateBookingToIssued(payment.booking_id);

    return {
      message: 'Payment successful',
      bookingStatus: 'ISSUED',
      ticketCount: tickets.length,
      tickets,
    };
  }

  async processPaymentFailed(paymentId: number, reason?: string): Promise<{
    message: string;
    bookingStatus: string;
  }> {
    // Get payment
    const payment = await this.paymentsRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== 'PENDING') {
      throw new BadRequestException(
        `Payment status is ${payment.payment_status}, only PENDING can be failed`,
      );
    }

    // Update payment to FAILED
    await this.paymentsRepository.updatePaymentFailed(
      paymentId,
      reason || 'Payment failed',
    );

    // Update booking to FAILED
    await this.bookingsService.updateBookingToFailed(payment.booking_id);

    return {
      message: 'Payment failed',
      bookingStatus: 'FAILED',
    };
  }

  async getPaymentByBookingId(bookingId: number): Promise<Payment | null> {
    return this.paymentsRepository.findPaymentById(bookingId);
  }
}