export function canSwitchPendingPaymentMethod(
  existingMethod: string | null | undefined,
  requestedMethod: string | null | undefined,
): boolean {
  const existing = String(existingMethod ?? '').trim().toUpperCase();
  const requested = String(requestedMethod ?? '').trim().toUpperCase();

  if (!existing || !requested) return false;
  if (existing === requested) return true;

  // CASH là cam kết giữ vé tại quầy. Khi payment CASH còn PENDING,
  // booking được giữ tới khung check-in nên không đổi sang kênh khác
  // trên cùng booking. Muốn đổi phương thức, người dùng hủy đơn và đặt lại.
  if (existing === 'CASH') return false;

  return true;
}
