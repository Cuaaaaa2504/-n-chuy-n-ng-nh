import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShowtimeSeatsService } from './showtime-seats.service';

/**
 * FIX BUG-09: scheduler trước đây tự chạy `EXEC sp_release_expired_holds` bằng
 * raw query — trùng lặp với `ShowtimeSeatsService.expireSeatHolds()` và KHÔNG có
 * fallback. Nếu stored procedure chưa tồn tại, job này log lỗi mỗi phút rồi thôi,
 * ghế HELD hết hạn không bao giờ được trả lại.
 *
 * Nay job gọi thẳng service — hưởng luôn cơ chế fallback TypeORM ở đó, và chỉ
 * còn MỘT nơi duy nhất chứa logic giải phóng ghế.
 */
@Injectable()
export class SeatHoldSchedulerService {
  private readonly logger = new Logger(SeatHoldSchedulerService.name);

  /** Tránh spam cảnh báo mỗi phút khi stored procedure vắng mặt lâu dài */
  private warnedAboutFallback = false;

  constructor(private readonly showtimeSeatsService: ShowtimeSeatsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireSeatHolds(): Promise<void> {
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
      // Lỗi ở đây KHÔNG được ném ra ngoài, nếu không sẽ thành unhandled rejection
      // và có thể làm sập tiến trình Node.
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Không thể giải phóng ghế giữ hết hạn', stack);
    }
  }
}
