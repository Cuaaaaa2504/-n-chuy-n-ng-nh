import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';
import { Payment } from '../src/entities/payment.entity';
import { BookingOrder } from '../src/entities/booking-order.entity';

test('createPayment không làm CASH PENDING thất bại khi người dùng đổi phương thức', async () => {
  let failedUpdateCalled = false;
  let createPaymentCalled = false;

  const paymentRepository = {
    findPendingByBookingId: async () => ({
      paymentId: '901',
      bookingId: '101',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      amount: 120000,
      transactionCode: 'PAY-CASH-901',
      createdAt: new Date('2026-08-11T03:00:00.000Z'),
    }),
    updatePaymentFailed: async () => {
      failedUpdateCalled = true;
    },
    createPayment: async () => {
      createPaymentCalled = true;
      return {};
    },
    generatePaymentCode: () => 'PAY-NEW',
  };

  const bookingService = {
    validateBookingForPayment: async () => ({
      bookingId: '101',
      finalAmount: 120000,
    }),
  };

  const service = new PaymentService(
    paymentRepository as any,
    bookingService as any,
    {} as any,
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

  assert.equal(failedUpdateCalled, false);
  assert.equal(createPaymentCalled, false);
});

test('processPaymentSuccess khóa payment và booking trước khi đổi trạng thái', async () => {
  let paymentFindOptions: any;
  let bookingFindOptions: any;
  let rolledBack = false;
  let released = false;

  const manager = {
    findOne: async (entity: unknown, options: any) => {
      if (entity === Payment) {
        paymentFindOptions = options;
        return {
          paymentId: '901',
          bookingId: '101',
          paymentStatus: 'PENDING',
          amount: 120000,
        };
      }

      if (entity === BookingOrder) {
        bookingFindOptions = options;
        return {
          bookingId: '101',
          status: 'PAID',
          totalAmount: 120000,
          bookingDetails: [],
        };
      }

      return null;
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

  const dataSource = {
    createQueryRunner: () => queryRunner,
  };

  const service = new PaymentService(
    {} as any,
    {} as any,
    dataSource as any,
    { get: () => undefined } as any,
  );

  await assert.rejects(
    () => service.processPaymentSuccess('901'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      /không ở trạng thái chờ thanh toán/i.test(error.message),
  );

  assert.deepEqual(paymentFindOptions.lock, {
    mode: 'pessimistic_write',
  });
  assert.deepEqual(bookingFindOptions.lock, {
    mode: 'pessimistic_write',
  });
  assert.equal(rolledBack, true);
  assert.equal(released, true);
});
