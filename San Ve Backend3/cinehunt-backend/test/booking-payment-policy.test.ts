import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPendingPaymentSeatState,
  canAdminTransitionBooking,
  canUserCancelBooking,
  getCounterPaymentDeadline,
  isCounterPaymentExpired,
} from '../src/booking/booking-state.policy';
import { hasVoucherUsageRemaining } from '../src/payment/voucher-usage.policy';

test('đơn CASH hết hạn đúng 10 phút sau giờ chiếu', () => {
  const start = new Date('2026-08-06T12:00:00.000Z');
  assert.equal(
    getCounterPaymentDeadline(start).toISOString(),
    '2026-08-06T12:10:00.000Z',
  );
  assert.equal(
    isCounterPaymentExpired(start, new Date('2026-08-06T12:09:59.999Z')),
    false,
  );
  assert.equal(
    isCounterPaymentExpired(start, new Date('2026-08-06T12:10:00.000Z')),
    true,
  );
});

test('không chấp nhận thời gian gia hạn âm', () => {
  assert.throws(
    () => getCounterPaymentDeadline(new Date(), -1),
    /graceMinutes/,
  );
});

test('người dùng chỉ được hủy đơn đang chờ thanh toán', () => {
  assert.equal(canUserCancelBooking('PENDING_PAYMENT'), true);
  assert.equal(canUserCancelBooking('PAID'), false);
  assert.equal(canUserCancelBooking('CONFIRMED'), false);
  assert.equal(canUserCancelBooking('REFUNDED'), false);
});

test('admin không được bỏ qua payment hoặc refund flow', () => {
  assert.equal(
    canAdminTransitionBooking('PENDING_PAYMENT', 'CANCELLED'),
    true,
  );
  assert.equal(
    canAdminTransitionBooking('PENDING_PAYMENT', 'EXPIRED'),
    true,
  );
  assert.equal(canAdminTransitionBooking('PENDING_PAYMENT', 'PAID'), false);
  assert.equal(canAdminTransitionBooking('PAID', 'CANCELLED'), false);
  assert.equal(canAdminTransitionBooking('CONFIRMED', 'REFUNDED'), false);
});

test('ghế vẫn HELD trong lúc booking chờ thanh toán', () => {
  const expiresAt = new Date('2026-08-06T12:10:00.000Z');
  assert.deepEqual(buildPendingPaymentSeatState(25, expiresAt), {
    status: 'HELD',
    heldByUserId: 25,
    holdExpiresAt: expiresAt,
  });
});

test('voucher chỉ hết lượt khi usedCount đạt usageLimit', () => {
  assert.equal(hasVoucherUsageRemaining(999, null), true);
  assert.equal(hasVoucherUsageRemaining(2, 3), true);
  assert.equal(hasVoucherUsageRemaining(3, 3), false);
  assert.equal(hasVoucherUsageRemaining(4, 3), false);
});
