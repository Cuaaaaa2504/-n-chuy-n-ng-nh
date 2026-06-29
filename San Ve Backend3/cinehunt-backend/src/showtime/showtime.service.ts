import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Showtime } from '../entities/showtime.entity';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

@Injectable()
export class ShowtimeService {
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
  ) {}

  async findAll(): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: {
        status: Not('CANCELLED'),
      },
      order: {
        start_time: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Showtime> {
    const showtime = await this.showtimeRepository.findOne({
      where: {
        showtime_id: id,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    return showtime;
  }

  async findByMovie(movieId: number): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: {
        movie_id: movieId,
        status: 'OPEN',
      },
      order: {
        start_time: 'ASC',
      },
    });
  }

  async findByRoom(roomId: number): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: {
        room_id: roomId,
        status: Not('CANCELLED'),
      },
      order: {
        start_time: 'ASC',
      },
    });
  }

  private validateTimeRange(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new ConflictException(
        'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
      );
    }
  }

  private async ensureNoScheduleOverlap(
    roomId: number,
    startTime: Date,
    endTime: Date,
    excludeShowtimeId?: number,
  ): Promise<void> {
    const qb = this.showtimeRepository
      .createQueryBuilder('showtime')
      .where('showtime.room_id = :roomId', { roomId })
      .andWhere('showtime.status != :cancelledStatus', {
        cancelledStatus: 'CANCELLED',
      })
      .andWhere('showtime.start_time < :endTime', { endTime })
      .andWhere('showtime.end_time > :startTime', { startTime });

    if (excludeShowtimeId) {
      qb.andWhere('showtime.showtime_id != :excludeShowtimeId', {
        excludeShowtimeId,
      });
    }

    const overlappingShowtime = await qb.getOne();

    if (overlappingShowtime) {
      throw new ConflictException(
        'Lịch chiếu bị trùng thời gian với một suất chiếu khác trong cùng phòng',
      );
    }
  }

  async create(dto: CreateShowtimeDto): Promise<Showtime> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    this.validateTimeRange(startTime, endTime);
    await this.ensureNoScheduleOverlap(dto.roomId, startTime, endTime);

    const newShowtime = this.showtimeRepository.create({
      movie_id: dto.movieId,
      room_id: dto.roomId,
      start_time: startTime,
      end_time: endTime,
      base_price: dto.basePrice,
      status: dto.status ?? 'OPEN',
    });

    return this.showtimeRepository.save(newShowtime);
  }

  async update(id: number, dto: UpdateShowtimeDto): Promise<Showtime> {
    const existing = await this.findOne(id);

    const nextMovieId = dto.movieId ?? existing.movie_id;
    const nextRoomId = dto.roomId ?? existing.room_id;
    const nextStartTime = dto.startTime
      ? new Date(dto.startTime)
      : existing.start_time;
    const nextEndTime = dto.endTime
      ? new Date(dto.endTime)
      : existing.end_time;
    const nextBasePrice = dto.basePrice ?? existing.base_price;
    const nextStatus = dto.status ?? existing.status;

    this.validateTimeRange(nextStartTime, nextEndTime);

    if (nextStatus !== 'CANCELLED') {
      await this.ensureNoScheduleOverlap(
        nextRoomId,
        nextStartTime,
        nextEndTime,
        id,
      );
    }

    const updated = this.showtimeRepository.merge(existing, {
      movie_id: nextMovieId,
      room_id: nextRoomId,
      start_time: nextStartTime,
      end_time: nextEndTime,
      base_price: nextBasePrice,
      status: nextStatus,
    });

    return this.showtimeRepository.save(updated);
  }

  async remove(id: number): Promise<{ message: string }> {
    const existing = await this.findOne(id);

    existing.status = 'CANCELLED';
    await this.showtimeRepository.save(existing);

    return { message: 'Showtime cancelled successfully' };
  }
}
