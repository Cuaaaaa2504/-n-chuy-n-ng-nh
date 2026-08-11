import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SeatHoldService } from '../src/showtime-seats/seat-hold/seat-hold.service';
import {
  SeatHold,
  SeatHoldStatus,
} from '../src/entities/seat-hold.entity';
import { ShowtimeSeat } from '../src/entities/showtime-seat.entity';
import { RefundService } from '../src/refund/refund.service';
import { Refund } from '../src/entities/refund.entity';
import { BookingOrder } from '../src/entities/booking-order.entity';
import { BookingDetail } from '../src/entities/booking-detail.entity';
import { Ticket } from '../src/entities/ticket.entity';
import { ShowtimeService } from '../src/showtime/showtime.service';
import { Showtime } from '../src/entities/showtime.entity';

test('releaseHold không nhả ghế nếu hold đã được booking xử lý', async () => {
  let holdReadCount = 0;
  let releaseSqlCalled = false;

  const manager = {
    findOne: async (entity: unknown) => {
      if (entity === SeatHold) {
        holdReadCount += 1;
        return holdReadCount === 1
          ? {
              holdId: '11',
              userId: 25,
              showtimeSeatId: 101,
              status: SeatHoldStatus.ACTIVE,
            }
          : null;
      }

      if (entity === ShowtimeSeat) {
        return {
          showtimeSeatId: 101,
          status: 'HELD',
          heldByUserId: 25,
        };
      }

      return null;
    },
    update: async () => {
      throw new Error('Không được update hold stale');
    },
    query: async () => {
      releaseSqlCalled = true;
      return [];
    },
  };

  const queryRunner = {
    manager,
    isTransactionActive: true,
    connect: async () => undefined,
    startTransaction: async () => undefined,
    commitTransaction: async () => undefined,
    rollbackTransaction: async () => undefined,
    release: async () => undefined,
  };

  const service = new SeatHoldService(
    {} as any,
    {} as any,
    { createQueryRunner: () => queryRunner } as any,
  );

  await assert.rejects(
    () => service.releaseHold('11', 25),
    (error: unknown) => error instanceof ConflictException,
  );

  assert.equal(releaseSqlCalled, false);
});

test('refund approve hủy ticket trước khi trả ghế', async () => {
  const updates: Array<{
    entity: unknown;
    patch: unknown;
  }> = [];

  const manager = {
    findOne: async (entity: unknown) => {
      if (entity === Refund) {
        return {
          refundId: '9',
          bookingId: '77',
          paymentId: '88',
          refundStatus: 'PENDING',
        };
      }

      if (entity === BookingOrder) {
        return {
          bookingId: '77',
          userId: 25,
          status: 'PAID',
        };
      }

      return null;
    },
    query: async () => [],
    find: async (entity: unknown) => {
      if (entity === BookingDetail) {
        return [
          {
            bookingDetailId: '501',
            showtimeSeatId: 301,
          },
        ];
      }
      return [];
    },
    update: async (
      entity: unknown,
      _criteria: unknown,
      patch: unknown,
    ) => {
      updates.push({ entity, patch });
      return { affected: 1 };
    },
  };

  const service = new RefundService(
    {
      findOne: async () => ({
        refundId: '9',
        bookingId: '77',
        paymentId: '88',
        refundStatus: 'SUCCESS',
      }),
    } as any,
    {} as any,
    {} as any,
    {
      transaction: async (
        callback: (manager: any) => Promise<unknown>,
      ) => callback(manager),
    } as any,
  );

  await service.approve('9');

  assert.equal(
    updates.some(
      (entry) =>
        entry.entity === Ticket &&
        (entry.patch as { ticketStatus?: string }).ticketStatus ===
          'CANCELLED',
    ),
    true,
  );

  assert.equal(
    updates.some(
      (entry) =>
        entry.entity === ShowtimeSeat &&
        (entry.patch as { status?: string }).status === 'AVAILABLE',
    ),
    true,
  );
});

test('refund approve từ chối ticket USED', async () => {
  let updateCalled = false;

  const manager = {
    findOne: async (entity: unknown) => {
      if (entity === Refund) {
        return {
          refundId: '10',
          bookingId: '78',
          paymentId: '89',
          refundStatus: 'PENDING',
        };
      }

      if (entity === BookingOrder) {
        return {
          bookingId: '78',
          userId: 25,
          status: 'PAID',
        };
      }

      return null;
    },
    query: async () => [
      { ticket_id: 'T-1', ticket_status: 'USED' },
    ],
    find: async () => [],
    update: async () => {
      updateCalled = true;
      return { affected: 1 };
    },
  };

  const service = new RefundService(
    { findOne: async () => null } as any,
    {} as any,
    {} as any,
    {
      transaction: async (
        callback: (manager: any) => Promise<unknown>,
      ) => callback(manager),
    } as any,
  );

  await assert.rejects(
    () => service.approve('10'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /check-in/i.test(error.message),
  );

  assert.equal(updateCalled, false);
});

test('cancel showtime vô hiệu hóa ticket/booking/hold và block ghế', async () => {
  const statements: string[] = [];

  const showtimeRepository = {
    createQueryBuilder: () => {
      const chain = {
        setLock: () => chain,
        where: () => chain,
        getOne: async () => ({
          showtimeId: 55,
          roomId: 7,
          status: 'OPEN',
        }),
      };
      return chain;
    },
  };

  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === Showtime) return showtimeRepository;
      return {};
    },
    query: async (sql: string) => {
      statements.push(sql);

      if (/sp_getapplock/i.test(sql)) {
        return [{ lock_result: 0 }];
      }

      if (/select top \(1\) t\.ticket_id/i.test(sql)) {
        return [];
      }

      return [];
    },
    save: async (_entity: unknown, value: unknown) => value,
  };

  const service = new ShowtimeService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {
      transaction: async (
        callback: (manager: any) => Promise<unknown>,
      ) => callback(manager),
    } as any,
  );

  await service.remove(55);

  const sql = statements.join('\n').toLowerCase();

  assert.match(sql, /update t[\s\S]*ticket_status = 'cancelled'/);
  assert.match(sql, /update h[\s\S]*status = 'cancelled'/);
  assert.match(sql, /update bo[\s\S]*bo\.status = 'cancelled'/);
  assert.match(
    sql,
    /update dbo\.showtime_seats[\s\S]*status = 'blocked'/,
  );
});
