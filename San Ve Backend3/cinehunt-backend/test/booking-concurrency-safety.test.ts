import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { BookingService } from '../src/booking/booking.service';
import { BookingOrder } from '../src/entities/booking-order.entity';

function createService(dataSource: any) {
  return new BookingService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    dataSource as any,
  );
}

test('expirePendingBookings re-check ứng viên dưới transaction lock', async () => {
  let mutationCalled = false;
  const service = createService({
    query: async () => [{ booking_id: '101' }],
    transaction: async (callback: (manager: any) => Promise<any>) =>
      callback({
        query: async () => [],
        find: async () => {
          mutationCalled = true;
          return [];
        },
        update: async () => {
          mutationCalled = true;
        },
        delete: async () => {
          mutationCalled = true;
        },
      }),
  });

  const result = await service.expirePendingBookings();
  assert.deepEqual(result, { expiredCount: 0 });
  assert.equal(mutationCalled, false);
});

test('cancelBooking không dùng trạng thái stale bên ngoài transaction', async () => {
  let lockOptions: any;
  let updateCalled = false;
  const service = createService({
    transaction: async (callback: (manager: any) => Promise<any>) =>
      callback({
        findOne: async (entity: unknown, options: any) => {
          if (entity === BookingOrder) {
            lockOptions = options.lock;
            return {
              bookingId: '101',
              userId: 25,
              status: 'PAID',
            };
          }
          return null;
        },
        update: async () => {
          updateCalled = true;
        },
      }),
  });

  await assert.rejects(
    () => service.cancelBooking('101', 25),
    (error: unknown) =>
      error instanceof BadRequestException && /không thể hủy/i.test(error.message),
  );
  assert.deepEqual(lockOptions, { mode: 'pessimistic_write' });
  assert.equal(updateCalled, false);
});

test('safe seat release bảo vệ ACTIVE hold và booking mới', async () => {
  let sql = '';
  let holdUpdateCalled = false;
  const service = createService({});
  const manager = {
    query: async (statement: string) => {
      sql = statement.toLowerCase();
      return [];
    },
    update: async () => {
      holdUpdateCalled = true;
    },
  };

  const released = await (service as any).releaseBookingSeatsSafely(
    manager,
    '101',
    25,
    [501],
    'EXPIRED',
    new Date(),
  );

  assert.deepEqual(released, []);
  assert.match(sql, /seat_holds/);
  assert.match(sql, /active_hold\.status = 'active'/);
  assert.match(sql, /other_detail\.booking_id <> @2/);
  assert.match(sql, /other_booking\.status in/);
  assert.match(sql, /held_by_user_id = @1/);
  assert.equal(holdUpdateCalled, false);
});
