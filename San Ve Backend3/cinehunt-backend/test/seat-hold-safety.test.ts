import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { QueryRunner } from 'typeorm';
import { HoldManySeatsDto } from '../src/showtime-seats/dto/hold-many-seats.dto';
import { HoldSeatDto } from '../src/showtime-seats/dto/hold-seat.dto';
import { FixExpiredSeatHoldConsistency1786016820000 } from '../src/migrations/1786016820000-FixExpiredSeatHoldConsistency';

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
