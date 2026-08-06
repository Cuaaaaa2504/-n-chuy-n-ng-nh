import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShowtimeSeatsService } from './showtime-seats.service';

@Injectable()
export class SeatHoldSchedulerService {
  private readonly logger = new Logger(SeatHoldSchedulerService.name);

  private warnedAboutFallback = false;
  private running = false;

  constructor(private readonly showtimeSeatsService: ShowtimeSeatsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireSeatHolds(): Promise<void> {
    if (this.running) {
      this.logger.warn('Bỏ qua lượt giải phóng ghế vì lượt trước chưa hoàn tất.');
      return;
    }

    this.running = true;
    try {
      const result = await this.showtimeSeatsService.expireSeatHolds();

      if (result.strategy === 'fallback' && !this.warnedAboutFallback) {
        this.warnedAboutFallback = true;
        this.logger.warn(
          'Đang dùng fallback TypeORM để giải phóng ghế. Hãy chạy file SQL để ' +
            'tạo stored procedure sp_release_expired_holds.',
        );
      }

      const released = result.releasedSeats ?? 0;
      const expired = result.expiredHolds ?? 0;
      if (released > 0 || expired > 0) {
        this.logger.log(`Đã trả lại ${released} ghế, ${expired} hold hết hạn`);
      }
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Không thể giải phóng ghế giữ hết hạn', stack);
    } finally {
      this.running = false;
    }
  }
}
