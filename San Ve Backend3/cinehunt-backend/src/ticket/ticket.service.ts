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
      where: { ticketCode },
      relations: ['bookingDetail'],
    });
    if (!ticket) throw new NotFoundException(`Vé ${ticketCode} không tồn tại`);
    return ticket;
  }

  async checkIn(ticketCode: string, staffId: number) {
    const ticket = await this.findByCode(ticketCode);

    if (ticket.ticketStatus === 'USED') {
      throw new BadRequestException('Vé này đã được check-in rồi');
    }
    if (ticket.ticketStatus === 'CANCELLED') {
      throw new BadRequestException('Vé này đã bị huỷ');
    }
    if (ticket.ticketStatus === 'EXPIRED') {
      throw new BadRequestException('Vé này đã hết hạn');
    }

    ticket.ticketStatus = 'USED';
    ticket.checkedInAt = new Date();
    ticket.checkedInBy = staffId;

    await this.ticketRepo.save(ticket);
    return {
      message: 'Check-in thành công',
      ticketCode: ticket.ticketCode,
      checkedInAt: ticket.checkedInAt,
    };
  }

  async findByBookingDetail(bookingDetailId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { bookingDetailId },
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy vé');
    return ticket;
  }
}
