import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async findByCode(ticketCode: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code: ticketCode },
      relations: ['booking_detail'],
    });
    if (!ticket) throw new NotFoundException(`Vé ${ticketCode} không tồn tại`);
    return ticket;
  }

  async checkIn(ticketCode: string, staffId: number) {
    const ticket = await this.findByCode(ticketCode);

    if (ticket.ticket_status === 'USED') {
      throw new BadRequestException('Vé này đã được check-in rồi');
    }
    if (ticket.ticket_status === 'CANCELLED') {
      throw new BadRequestException('Vé này đã bị huỷ');
    }
    if (ticket.ticket_status === 'EXPIRED') {
      throw new BadRequestException('Vé này đã hết hạn');
    }

    ticket.ticket_status = 'USED';
    ticket.checked_in_at = new Date();
    ticket.checked_in_by = staffId;

    await this.ticketRepo.save(ticket);
    return {
      message: 'Check-in thành công',
      ticket_code: ticket.ticket_code,
      checked_in_at: ticket.checked_in_at,
    };
  }

  async findByBookingDetail(bookingDetailId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { booking_detail_id: bookingDetailId },
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy vé');
    return ticket;
  }
}