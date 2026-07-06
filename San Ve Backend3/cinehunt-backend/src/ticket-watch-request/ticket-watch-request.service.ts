import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchRequest } from '../entities/ticket-watch-request.entity';

@Injectable()
export class TicketWatchRequestService {
  constructor(
    @InjectRepository(TicketWatchRequest)
    private readonly repo: Repository<TicketWatchRequest>,
  ) {}

  async create(userId: number, dto: { movieId: number; preferredDate?: string; notes?: string }) {
    const request = this.repo.create({
      userId,
      movieId: dto.movieId,
      preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
      notes: dto.notes ?? null,
      status: 'ACTIVE',
    });
    return this.repo.save(request);
  }

  async findByUser(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(watchId: number, userId: number) {
    const request = await this.repo.findOne({ where: { watchId } });
    if (!request) throw new NotFoundException(`WatchRequest #${watchId} không tồn tại`);
    if (request.userId !== userId)
      throw new BadRequestException('Không có quyền truy cập');
    return request;
  }

  async cancel(watchId: number, userId: number) {
    const request = await this.findOne(watchId, userId);
    request.status = 'CANCELLED';
    return this.repo.save(request);
  }

  async listAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async matchShowtime(watchId: number, showtimeId: number) {
    const request = await this.repo.findOne({
      where: { watchId, status: 'ACTIVE' },
    });
    if (!request) throw new NotFoundException('Watch request không tồn tại hoặc không ở trạng thái ACTIVE');
    request.matchedShowtimeId = showtimeId;
    request.matchedAt = new Date();
    request.status = 'MATCHED';
    return this.repo.save(request);
  }
}
