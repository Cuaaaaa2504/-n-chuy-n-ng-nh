import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      min_seats: dto.minSeats ?? 1,
      max_price: dto.maxPrice ?? null,
      expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
      status: 'ACTIVE',
    });
    return this.watchRepo.save(request);
  }

  async getMyRequests(userId: number) {
    return this.watchRepo.find({
      where: { user_id: userId },
      relations: ['movie', 'cinema', 'matched_showtime'],
      order: { created_at: 'DESC' },
    });
  }

  async cancel(watchId: string, userId: number) {
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

  /** ADMIN – xem tất cả */
  async findAll() {
    return this.watchRepo.find({
      relations: ['user', 'movie', 'cinema', 'matched_showtime'],
      order: { created_at: 'DESC' },
    });
  }

  async findByMovie(movieId: number) {
    return this.watchRepo.find({
      where: { movie_id: movieId, status: 'ACTIVE' },
      relations: ['user'],
    });
  }

  /** Đánh dấu yêu cầu đã được khớp với suất chiếu */
  async markMatched(watchId: string, showtimeId: number) {
    const request = await this.watchRepo.findOne({
      where: { watch_id: watchId, status: 'ACTIVE' },
    });
    if (!request) return null;
    request.status = 'MATCHED';
    request.matched_showtime_id = showtimeId;
    request.matched_at = new Date();
    await this.watchRepo.save(request);
    return request;
  }
}
