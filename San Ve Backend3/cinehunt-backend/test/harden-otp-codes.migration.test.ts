import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { QueryRunner } from 'typeorm';
import { HardenOtpCodes1785605000000 } from '../src/migrations/1785605000000-HardenOtpCodes';

test('HardenOtpCodes references used_at only after the ALTER batch', async () => {
  const queries: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      queries.push(sql);
      return [];
    },
  } as unknown as QueryRunner;

  await new HardenOtpCodes1785605000000().up(queryRunner);

  assert.equal(queries.length, 2);
  assert.match(queries[0], /ALTER TABLE dbo\.otp_codes ADD used_at/i);
  assert.doesNotMatch(queries[0], /UPDATE dbo\.otp_codes/i);
  assert.match(queries[1], /UPDATE dbo\.otp_codes/i);
  assert.match(queries[1], /COALESCE\(used_at, SYSDATETIME\(\)\)/i);
});
