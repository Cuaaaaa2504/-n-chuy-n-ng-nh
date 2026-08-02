export type PaymentAccessMode = 'READ_BOOKING' | 'FAIL_PAYMENT' | 'CONFIRM_PAYMENT';

export interface PaymentPrincipal {
  userId: number;
  role?: string;
}

export interface PaymentAccessInput {
  principal: PaymentPrincipal;
  ownerId: number;
  paymentMethod?: string;
  mode: PaymentAccessMode;
  allowDemoPayment: boolean;
}

export function canAccessPayment(input: PaymentAccessInput): boolean {
  const role = String(input.principal.role ?? '').toUpperCase();
  if (role === 'ADMIN' || role === 'STAFF') return true;
  if (input.principal.userId !== input.ownerId) return false;

  if (input.mode === 'CONFIRM_PAYMENT') {
    return (
      input.allowDemoPayment &&
      String(input.paymentMethod ?? '').toUpperCase() === 'MOCK'
    );
  }

  return true;
}
