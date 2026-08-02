import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { canAccessPayment } from '../src/payment/payment-access.policy';

const customer = { userId: 7, role: 'CUSTOMER' };

test('customer cannot access another user payment', () => {
  assert.equal(
    canAccessPayment({
      principal: customer,
      ownerId: 8,
      paymentMethod: 'MOCK',
      mode: 'READ_BOOKING',
      allowDemoPayment: true,
    }),
    false,
  );
});

test('customer can cancel or read only their own payment', () => {
  for (const mode of ['READ_BOOKING', 'FAIL_PAYMENT'] as const) {
    assert.equal(
      canAccessPayment({
        principal: customer,
        ownerId: 7,
        paymentMethod: 'BANKING',
        mode,
        allowDemoPayment: false,
      }),
      true,
    );
  }
});

test('customer can confirm only MOCK payment in explicitly enabled dev mode', () => {
  assert.equal(
    canAccessPayment({
      principal: customer,
      ownerId: 7,
      paymentMethod: 'MOCK',
      mode: 'CONFIRM_PAYMENT',
      allowDemoPayment: true,
    }),
    true,
  );

  for (const paymentMethod of ['BANKING', 'CASH', 'MOMO', 'VNPAY']) {
    assert.equal(
      canAccessPayment({
        principal: customer,
        ownerId: 7,
        paymentMethod,
        mode: 'CONFIRM_PAYMENT',
        allowDemoPayment: true,
      }),
      false,
    );
  }
});

test('staff and admin may process payments', () => {
  for (const role of ['STAFF', 'ADMIN']) {
    assert.equal(
      canAccessPayment({
        principal: { userId: 99, role },
        ownerId: 7,
        paymentMethod: 'CASH',
        mode: 'CONFIRM_PAYMENT',
        allowDemoPayment: false,
      }),
      true,
    );
  }
});
