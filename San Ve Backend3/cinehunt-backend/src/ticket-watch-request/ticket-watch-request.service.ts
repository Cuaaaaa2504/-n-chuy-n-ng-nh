import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchRequest } from '../entities/ticket-watch-request.entity';

@Injectable()
export class TicketWatchRequestService {
  constructor(
    @InjectRepository(TicketWatchRequest)
    private readonly repo: Repository<TicketWatchRequest>,
  ) {}

  async create(
    userId: number,
    dto: { movieId: number; preferredDate?: string; notes?: string },
  ) {
    const data: any = {
      userId,
      movieId: dto.movieId,
      preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
      notes: dto.notes ?? null,
      status: 'ACTIVE',
    };
    const request = this.repo.create(data as unknown as TicketWatchRequest);
    return this.repo.save(request);
  }

  async getMyRequests(userId: number) {
    return this.repo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  findByUser(userId: number) {
    return this.getMyRequests(userId);
  }

  async findOne(watchId: number, userId: number) {
    const request = await this.repo.findOne({
      where: { watchId } as any,
    });
    if (!request)
      throw new NotFoundException(`WatchRequest #${watchId} không tồn tại`);
    if ((request as any).userId !== userId)
      throw new BadRequestException('Không có quyền truy cập');
    return request;
  }

  async cancel(watchId: number | string, userId: number) {
    const id = Number(watchId);
    const request = await this.findOne(id, userId);
    (request as any).status = 'CANCELLED';
    return this.repo.save(request);
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } as any });
  }

  listAll() {
    return this.findAll();
  }

  async findByMovie(movieId: number) {
    return this.repo.find({
      where: { movieId, status: 'ACTIVE' } as any,
    });
  }

  async matchShowtime(watchId: number, showtimeId: number) {
    const request = await this.repo.findOne({
      where: { watchId, status: 'ACTIVE' } as any,
    });
    if (!request)
      throw new NotFoundException(
        'Watch request không tồn tại hoặc không ở trạng thái ACTIVE',
      );
    request.matchedShowtimeId = showtimeId;
    request.matchedAt = new Date();
    (request as any).status = 'MATCHED';
    return this.repo.save(request);
  }
}
