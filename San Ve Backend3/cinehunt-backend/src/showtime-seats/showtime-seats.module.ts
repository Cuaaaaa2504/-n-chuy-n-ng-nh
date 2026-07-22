import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowtimeSeatsController } from './showtime-seats.controller';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { SeatHoldSchedulerService } from './seat-hold-scheduler.service';
import { SeatHoldModule } from './seat-hold/seat-hold.module';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { Showtime } from '../entities/showtime.entity';

@Module({
  imports: [
    // FIX BUG-07 (cùng loại): bỏ `Seat` — không provider nào trong module này
    // inject repository của nó. SeatHoldService dùng repo riêng đăng ký trong
    // SeatHoldModule. Entity thừa ở đây chỉ gây hiểu nhầm khi đọc code.
    TypeOrmModule.forFeature([ShowtimeSeat, SeatHold, Showtime]),
    SeatHoldModule,
  ],
  controllers: [ShowtimeSeatsController],
  providers: [ShowtimeSeatsService, SeatHoldSchedulerService],
  exports: [ShowtimeSeatsService],
})
export class ShowtimeSeatsModule {}
