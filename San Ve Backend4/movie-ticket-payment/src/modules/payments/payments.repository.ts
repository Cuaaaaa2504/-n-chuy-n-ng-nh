// src/modules/payments/payments.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(BookingDetail)
    private bookingDetailRepository: Repository<BookingDetail>,
  ) {}

  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepository.create(paymentData);
    return this.paymentRepository.save(payment);
  }

  async findPaymentById(paymentId: number): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { payment_id: paymentId },
      relations: ['booking'],
    });
  }

  async updatePaymentStatus(
    paymentId: number,
    status: string,
    paidAt?: Date,
    transactionCode?: string,
  ): Promise<void> {
    const updateData: any = { payment_status: status };
    if (paidAt) updateData.paid_at = paidAt;
    if (transactionCode) updateData.transaction_code = transactionCode;
    await this.paymentRepository.update(paymentId, updateData);
  }

  async updatePaymentFailed(paymentId: number, failedReason: string): Promise<void> {
    await this.paymentRepository.update(paymentId, {
      payment_status: 'FAILED',
      failed_reason: failedReason,
    });
  }

  async getBookingDetailsByBookingId(bookingId: number): Promise<BookingDetail[]> {
    return this.bookingDetailRepository.find({
      where: { booking_id: bookingId },
      relations: ['showtimeSeat', 'showtimeSeat.seat'],
    });
  }

  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    const ticket = this.ticketRepository.create(ticketData);
    return this.ticketRepository.save(ticket);
  }

  async createTickets(ticketsData: Partial<Ticket>[]): Promise<Ticket[]> {
    const tickets = this.ticketRepository.create(ticketsData);
    return this.ticketRepository.save(tickets);
  }

  async checkExistingTicket(bookingDetailId: number): Promise<boolean> {
    const ticket = await this.ticketRepository.findOne({
      where: { booking_detail_id: bookingDetailId },
    });
    return !!ticket;
  }

  generatePaymentCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${dateStr}-${randomStr}`;
  }

  generateTicketCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TICKET-${dateStr}-${randomStr}`;
  }

  generateQrCode(): string {
    return `QR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}