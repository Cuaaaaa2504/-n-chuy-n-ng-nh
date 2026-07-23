import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Refund } from '../entities/refund.entity';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { Payment } from '../entities/payment.entity';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';

@Module({
  // FIX [mục 5.1]: RefundService nay cần đọc booking + payment để tự xác thực
  // quyền sở hữu và tự tính số tiền hoàn, thay vì tin vào body của client.
  imports: [TypeOrmModule.forFeature([
    Refund,
    BookingOrder,
    BookingDetail,
    ShowtimeSeat,
    Payment,
  ])],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
