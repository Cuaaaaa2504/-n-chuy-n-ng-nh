export const COUNTER_PAYMENT_GRACE_MINUTES = 10;

export function getCounterPaymentDeadline(
  showtimeStart: Date | string,
  graceMinutes = COUNTER_PAYMENT_GRACE_MINUTES,
): Date {
  const start = new Date(showtimeStart);

  if (Number.isNaN(start.getTime())) {
    throw new TypeError('showtimeStart không hợp lệ');
  }

  if (!Number.isFinite(graceMinutes) || graceMinutes < 0) {
    throw new TypeError('graceMinutes phải là số không âm');
  }

  return new Date(start.getTime() + graceMinutes * 60_000);
}

export function isCounterPaymentExpired(
  showtimeStart: Date | string,
  now: Date = new Date(),
  graceMinutes = COUNTER_PAYMENT_GRACE_MINUTES,
): boolean {
  return (
    now.getTime() >=
    getCounterPaymentDeadline(showtimeStart, graceMinutes).getTime()
  );
}

export function canUserCancelBooking(status: string): boolean {
  return String(status ?? '').toUpperCase() === 'PENDING_PAYMENT';
}

export function canAdminTransitionBooking(
  currentStatus: string,
  nextStatus: string,
): boolean {
  const current = String(currentStatus ?? '').toUpperCase();
  const next = String(nextStatus ?? '').toUpperCase();

  return (
    current === 'PENDING_PAYMENT' &&
    ['CANCELLED', 'EXPIRED'].includes(next)
  );
}

export function buildPendingPaymentSeatState(
  userId: number,
  expiresAt: Date | null,
) {
  return {
    status: 'HELD' as const,
    heldByUserId: userId,
    holdExpiresAt: expiresAt,
  };
}
