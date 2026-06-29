// src/modules/showtimes/showtimes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowtimeSeat } from '../../database/entities/showtime-seat.entity';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectRepository(ShowtimeSeat)
    private showtimeSeatRepository: Repository<ShowtimeSeat>,
  ) {}

  async updateSeatToSold(showtimeSeatId: number): Promise<void> {
    await this.showtimeSeatRepository.update(showtimeSeatId, {
      status: 'SOLD',
      held_by_user_id: null,
      hold_expires_at: null,
    });
  }

  async updateSeatsToSold(showtimeSeatIds: number[]): Promise<void> {
    if (showtimeSeatIds.length === 0) return;
    
    await this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: 'SOLD',
        held_by_user_id: null,
        hold_expires_at: null,
      })
      .where('showtime_seat_id IN (:...ids)', { ids: showtimeSeatIds })
      .execute();
  }

  async getSeatById(showtimeSeatId: number): Promise<ShowtimeSeat | null> {
    return this.showtimeSeatRepository.findOne({
      where: { showtime_seat_id: showtimeSeatId },
      relations: ['seat'],
    });
  }
}