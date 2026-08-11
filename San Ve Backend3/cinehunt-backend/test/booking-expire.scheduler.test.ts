import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BookingExpireScheduler } from '../src/booking/scheduler/booking-expire.scheduler';

test('BookingExpireScheduler không chạy chồng hai lượt cron', async () => {
  let calls = 0;
  let resolveFirst!: () => void;
  const gate = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });

  const scheduler = new BookingExpireScheduler({
    expirePendingBookings: async () => {
      calls += 1;
      await gate;
      return { expiredCount: 0 };
    },
  } as any);

  const first = scheduler.handleExpiredBookings();
  await Promise.resolve();
  await scheduler.handleExpiredBookings();

  assert.equal(calls, 1);
  resolveFirst();
  await first;
});
