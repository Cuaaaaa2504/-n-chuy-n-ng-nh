import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { QueryRunner } from 'typeorm';
import { HoldManySeatsDto } from '../src/showtime-seats/dto/hold-many-seats.dto';
import { HoldSeatDto } from '../src/showtime-seats/dto/hold-seat.dto';
import { FixExpiredSeatHoldConsistency1786016820000 } from '../src/migrations/1786016820000-FixExpiredSeatHoldConsistency';
import { HardenBookingLifecycleConcurrency1786423740000 } from '../src/migrations/1786423740000-HardenBookingLifecycleConcurrency';

function hasConstraint(
  errors: Awaited<ReturnType<typeof validate>>,
  name: string,
): boolean {
  return errors.some((error) => Boolean(error.constraints?.[name]));
}

test('multi-seat hold accepts at most 8 unique seats for at most 10 minutes', async () => {
  const valid = plainToInstance(HoldManySeatsDto, {
    showtimeSeatIds: [1, 2, 3, 4, 5, 6, 7, 8],
    holdMinutes: 10,
  });

  assert.equal((await validate(valid)).length, 0);

  const tooMany = plainToInstance(HoldManySeatsDto, {
    showtimeSeatIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    holdMinutes: 10,
  });
  assert.equal(hasConstraint(await validate(tooMany), 'arrayMaxSize'), true);

  const duplicated = plainToInstance(HoldManySeatsDto, {
    showtimeSeatIds: [1, 1],
    holdMinutes: 10,
  });
  assert.equal(hasConstraint(await validate(duplicated), 'arrayUnique'), true);

  const tooLong = plainToInstance(HoldManySeatsDto, {
    showtimeSeatIds: [1],
    holdMinutes: 11,
  });
  assert.equal(hasConstraint(await validate(tooLong), 'max'), true);
});

test('single-seat hold rejects a duration above 10 minutes', async () => {
  const dto = plainToInstance(HoldSeatDto, {
    showtimeSeatId: 1,
    holdMinutes: 11,
  });

  assert.equal(hasConstraint(await validate(dto), 'max'), true);
});

test('expired-hold procedure leaves booking expiry to BookingExpireScheduler', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
      return [];
    },
  } as unknown as QueryRunner;

  await new FixExpiredSeatHoldConsistency1786016820000().up(queryRunner);

  const sql = statements.join('\n').toLowerCase();
  assert.match(sql, /showtime_seats/);
  assert.match(sql, /seat_holds/);
  assert.doesNotMatch(sql, /booking_orders/);
  assert.doesNotMatch(sql, /booking_details/);
});


test('harden migration chỉ trả ghế có ACTIVE hold và chặn duplicate PENDING payment', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
      return [];
    },
  } as unknown as QueryRunner;

  await new HardenBookingLifecycleConcurrency1786423740000().up(queryRunner);
  const sql = statements.join('\n').toLowerCase();

  assert.match(sql, /inner join dbo\.seat_holds/);
  assert.match(sql, /h\.status = 'active'/);
  assert.match(sql, /ss\.held_by_user_id = h\.user_id/);
  assert.match(sql, /ux_payments_one_pending_per_booking/);
  assert.match(sql, /where payment_status = 'pending'/);
});
test('migration rollback khôi phục procedure trước đó và xóa unique index', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
      return [];
    },
  } as unknown as QueryRunner;

  await new HardenBookingLifecycleConcurrency1786423740000().down(queryRunner);

  const sql = statements.join('\n').toLowerCase();
  assert.match(sql, /drop index ux_payments_one_pending_per_booking/);
  assert.match(sql, /create or alter procedure dbo\.sp_release_expired_holds/);
  assert.match(sql, /update ss with \(updlock, readpast, rowlock\)/);
  assert.doesNotMatch(sql, /inner join dbo\.seat_holds/);
});
