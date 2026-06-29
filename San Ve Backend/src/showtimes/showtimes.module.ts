import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './entities/showtime.entity';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Showtime])],
  controllers: [ShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}
