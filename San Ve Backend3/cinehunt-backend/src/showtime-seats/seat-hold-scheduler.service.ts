import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatHoldSchedulerService {
  private readonly logger = new Logger(SeatHoldSchedulerService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireSeatHolds() {
    try {
      await this.dataSource.query(`
        EXEC sp_release_expired_holds
      `);

      this.logger.log('Expired seat holds released');
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to expire seat holds', stack);
    }
  }
}
