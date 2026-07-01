import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketWatchRequestController } from './ticket-watch-request.controller';
import { TicketWatchRequestService } from './ticket-watch-request.service';
import { TicketWatchRequest } from '../entities/ticket-watch-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketWatchRequest])],
  controllers: [TicketWatchRequestController],
  providers: [TicketWatchRequestService],
  exports: [TicketWatchRequestService],
})
export class TicketWatchRequestModule {}
