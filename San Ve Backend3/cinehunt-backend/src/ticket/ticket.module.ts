import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { Ticket } from '../entities/ticket.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), PaymentModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
