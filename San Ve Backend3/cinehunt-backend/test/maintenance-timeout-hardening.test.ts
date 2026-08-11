import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { QueryRunner } from 'typeorm';
import { BookingService } from '../src/booking/booking.service';
import { ShowtimeSeatsService } from '../src/showtime-seats/showtime-seats.service';
import { HardenMaintenanceTimeouts1786435500000 } from '../src/migrations/1786435500000-HardenMaintenanceTimeouts';

test('booking expiry bỏ qua ngay khi lifecycle app-lock đang bận', async () => {
  const sqlCalls: string[] = [];

  const queryRunner = {
    connect: async () => undefined,
    query: async (sql: string) => {
      sqlCalls.push(sql);
      if (/sp_getapplock/i.test(sql)) return [{ lock_result: -1 }];
      return [];
    },
    release: async () => undefined,
  };

  const service = new BookingService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { createQueryRunner: () => queryRunner } as any,
  );

  const result = await service.expirePendingBookings();

  assert.deepEqual(result, { expiredCount: 0, skipped: true });
  assert.equal(
    sqlCalls.some((sql) => /CineHunt\.LifecycleMaintenance/i.test(sql)),
    true,
  );
});

test('seat hold maintenance hiểu kết quả skipped từ stored procedure', async () => {
  const service = new ShowtimeSeatsService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {
      query: async () => [
        {
          skipped: true,
          reason: 'maintenance-busy',
          releasedSeats: 0,
          expiredHolds: 0,
        },
      ],
    } as any,
  );

  const result = await service.expireSeatHolds();

  assert.equal(result.strategy, 'skipped');
  assert.equal(result.skippedReason, 'maintenance-busy');
});

test('seat hold maintenance không biến driver 15s timeout thành scheduler error', async () => {
  const service = new ShowtimeSeatsService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {
      query: async () => {
        throw new Error('Timeout: Request failed to complete in 15000ms');
      },
    } as any,
  );

  const result = await service.expireSeatHolds();

  assert.equal(result.strategy, 'skipped');
  assert.equal(result.skippedReason, 'sql-timeout');
});

test('maintenance migration dùng shared app-lock, lock timeout ngắn và expiry indexes', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
      return [];
    },
  } as unknown as QueryRunner;

  await new HardenMaintenanceTimeouts1786435500000().up(queryRunner);

  const sql = statements.join('\n').toLowerCase();

  assert.match(sql, /cinehunt\.lifecyclemaintenance/);
  assert.match(sql, /set lock_timeout 2000/);
  assert.match(sql, /@locktimeout = 0/);
  assert.match(sql, /errornumber = 1205/);
  assert.match(sql, /errornumber = 1222/);
  assert.match(sql, /ix_booking_orders_pending_expiry/);
  assert.match(sql, /ix_payments_booking_latest/);
  assert.match(sql, /ix_seat_holds_active_expiry/);
  assert.match(sql, /ix_showtime_seats_held_expiry/);
});
