import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';
import { Payment } from '../src/entities/payment.entity';
import { BookingOrder } from '../src/entities/booking-order.entity';
import { BookingDetail } from '../src/entities/booking-detail.entity';

test('createPayment chặn CASH PENDING đổi sang phương thức khác dưới booking lock', async () => {
  const calls: Array<{ entity: unknown; lock: unknown }> = [];

  const manager = {
    findOne: async (entity: unknown, options: any) => {
      calls.push({ entity, lock: options.lock });
      if (entity === BookingOrder) {
        return {
          bookingId: '101',
          userId: 25,
          status: 'PENDING_PAYMENT',
          totalAmount: 120000,
          expiresAt: null,
        };
      }
      if (entity === Payment) {
        return {
          paymentId: '901',
          bookingId: '101',
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
          amount: 120000,
          transactionCode: 'PAY-CASH-901',
          createdAt: new Date('2026-08-11T03:00:00.000Z'),
        };
      }
      return null;
    },
  };

  const service = new PaymentService(
    { generatePaymentCode: () => 'PAY-NEW' } as any,
    {
      validateBookingForPayment: async () => ({
        bookingId: '101',
        finalAmount: 120000,
      }),
    } as any,
    {
      transaction: async (callback: (manager: any) => Promise<any>) =>
        callback(manager),
    } as any,
    { get: () => undefined } as any,
  );

  await assert.rejects(
    () =>
      service.createPayment(
        25,
        { bookingId: '101', paymentMethod: 'BANKING' } as any,
      ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /thanh toán tiền mặt tại quầy/i.test(error.message),
  );

  assert.deepEqual(calls[0].lock, { mode: 'pessimistic_write' });
  assert.deepEqual(calls[1].lock, { mode: 'pessimistic_write' });
});

test('processPaymentSuccess dùng lock order Booking -> Payment', async () => {
  const calls: Array<{ entity: unknown; lock: unknown }> = [];
  let paymentReads = 0;
  let rolledBack = false;
  let released = false;

  const manager = {
    findOne: async (entity: unknown, options: any) => {
      calls.push({ entity, lock: options.lock });
      if (entity === Payment) {
        paymentReads += 1;
        return {
          paymentId: '901',
          bookingId: '101',
          paymentStatus: 'PENDING',
          amount: 120000,
        };
      }
      if (entity === BookingOrder) {
        return {
          bookingId: '101',
          userId: 25,
          status: 'PENDING_PAYMENT',
          totalAmount: 120000,
          expiresAt: null,
          promotionId: null,
        };
      }
      return null;
    },
    find: async (entity: unknown) => {
      if (entity === BookingDetail) return [];
      return [];
    },
  };

  const queryRunner = {
    manager,
    connect: async () => undefined,
    startTransaction: async () => undefined,
    commitTransaction: async () => undefined,
    rollbackTransaction: async () => {
      rolledBack = true;
    },
    release: async () => {
      released = true;
    },
  };

  const service = new PaymentService(
    {} as any,
    {} as any,
    { createQueryRunner: () => queryRunner } as any,
    { get: () => undefined } as any,
  );

  await assert.rejects(
    () => service.processPaymentSuccess('901'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /không tìm thấy ghế/i.test(error.message),
  );

  assert.equal(paymentReads, 2);
  assert.equal(calls[0].entity, Payment);
  assert.equal(calls[0].lock, undefined);
  assert.equal(calls[1].entity, BookingOrder);
  assert.deepEqual(calls[1].lock, { mode: 'pessimistic_write' });
  assert.equal(calls[2].entity, Payment);
  assert.deepEqual(calls[2].lock, { mode: 'pessimistic_write' });
  assert.equal(rolledBack, true);
  assert.equal(released, true);
});

test('processPaymentFailed hủy booking bằng lifecycle transaction thay vì fail payment trước', async () => {
  let cancelCalled = false;
  let directFailCalled = false;

  const service = new PaymentService(
    {
      findPaymentById: async () => ({
        paymentId: '901',
        bookingId: '101',
        paymentStatus: 'PENDING',
      }),
      updatePaymentFailed: async () => {
        directFailCalled = true;
      },
    } as any,
    {
      cancelBooking: async (bookingId: string, userId: number) => {
        assert.equal(bookingId, '101');
        assert.equal(userId, 25);
        cancelCalled = true;
        return { success: true };
      },
    } as any,
    {
      getRepository: () => ({
        findOne: async () => ({
          bookingId: '101',
          userId: 25,
          status: 'PENDING_PAYMENT',
        }),
      }),
    } as any,
    { get: () => undefined } as any,
  );

  const result = await service.processPaymentFailed('901');

  assert.deepEqual(result, {
    success: true,
    idempotent: false,
    paymentId: '901',
    status: 'FAILED',
  });
  assert.equal(cancelCalled, true);
  assert.equal(directFailCalled, false);
});
test('CASH generic confirm không được bỏ qua deadline; check-in flag thì được', async () => {
  const makeRunner = () => {
    const manager = {
      findOne: async (entity: unknown) => {
        if (entity === Payment) {
          return {
            paymentId: '902',
            bookingId: '102',
            paymentMethod: 'CASH',
            paymentStatus: 'PENDING',
            amount: 120000,
          };
        }

        if (entity === BookingOrder) {
          return {
            bookingId: '102',
            userId: 25,
            status: 'PENDING_PAYMENT',
            totalAmount: 120000,
            expiresAt: new Date('2020-01-01T00:00:00.000Z'),
            promotionId: null,
          };
        }

        return null;
      },
      find: async () => [],
    };

    return {
      manager,
      connect: async () => undefined,
      startTransaction: async () => undefined,
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
    };
  };

  const service = new PaymentService(
    {} as any,
    {} as any,
    { createQueryRunner: makeRunner } as any,
    { get: () => undefined } as any,
  );

  await assert.rejects(
    () => service.processPaymentSuccess('902'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /booking đã hết hạn/i.test(error.message),
  );

  await assert.rejects(
    () =>
      service.processPaymentSuccess('902', {
        allowExpiredCounterPayment: true,
      }),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /không tìm thấy ghế/i.test(error.message),
  );
});
