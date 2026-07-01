import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchRequest } from '../entities/ticket-watch-request.entity';
import { CreateWatchRequestDto } from './dto/create-watch-request.dto';

@Injectable()
export class TicketWatchRequestService {
  constructor(
    @InjectRepository(TicketWatchRequest)
    private readonly watchRepo: Repository<TicketWatchRequest>,
  ) {}

  async create(userId: number, dto: CreateWatchRequestDto) {
    const request = this.watchRepo.create({
      user_id: userId,
      movie_id: dto.movieId,
      cinema_id: dto.cinemaId ?? null,
      preferred_date: dto.preferredDate ? new Date(dto.preferredDate) : null,
      preferred_time_from: dto.preferredTimeFrom ?? null,
      preferred_time_to: dto.preferredTimeTo ?? null,
      preferred_seat_type: dto.preferredSeatType ?? null,
      seat_preference: dto.seatPreference ?? null,
      ticket_quantity: dto.ticketQuantity ?? 1,
      max_budget: dto.maxBudget ?? null,
      wants_combo: dto.wantsCombo ?? false,
      status: 'ACTIVE',
    });
    return this.watchRepo.save(request);
  }

  async getMyRequests(userId: number) {
    return this.watchRepo.find({
      where: { user_id: userId },
      relations: ['movie', 'cinema'],
      order: { created_at: 'DESC' },
    });
  }

  async cancel(watchId: number, userId: number) {
    const request = await this.watchRepo.findOne({
      where: { watch_id: watchId },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (request.user_id !== userId)
      throw new ForbiddenException('Bạn không có quyền hủy yêu cầu này');
    if (request.status !== 'ACTIVE')
      throw new ForbiddenException('Yêu cầu này không thể hủy');

    request.status = 'CANCELLED';
    await this.watchRepo.save(request);
    return { message: 'Đã hủy yêu cầu theo dõi vé' };
  }

  // ADMIN xem tất cả
  async findAll() {
    return this.watchRepo.find({
      relations: ['user', 'movie', 'cinema'],
      order: { created_at: 'DESC' },
    });
  }

  async findByMovie(movieId: number) {
    return this.watchRepo.find({
      where: { movie_id: movieId, status: 'ACTIVE' },
      relations: ['user'],
    });
  }
}
