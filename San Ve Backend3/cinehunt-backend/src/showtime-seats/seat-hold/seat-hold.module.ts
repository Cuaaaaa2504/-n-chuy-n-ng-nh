import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatHoldService } from './seat-hold.service';
import { SeatHold } from '../../entities/seat-hold.entity';
import { ShowtimeSeat } from '../../entities/showtime-seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeatHold, ShowtimeSeat])],
  providers: [SeatHoldService],
  exports: [SeatHoldService],
})
export class SeatHoldModule {}
