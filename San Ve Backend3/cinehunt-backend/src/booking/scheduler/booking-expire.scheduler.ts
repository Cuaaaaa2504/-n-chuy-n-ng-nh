import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from '../booking.service';

@Injectable()
export class BookingExpireScheduler {
  private readonly logger = new Logger(BookingExpireScheduler.name);

  constructor(private readonly bookingService: BookingService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredBookings() {
    try {
      const result = await this.bookingService.expirePendingBookings();

      if (result.expiredCount > 0) {
        this.logger.log(`Đã hủy ${result.expiredCount} đơn đặt vé hết hạn`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi xử lý đơn hết hạn: ${message}`);
    }
  }
}