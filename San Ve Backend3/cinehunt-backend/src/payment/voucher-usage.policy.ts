export function hasVoucherUsageRemaining(
  usedCount: number,
  usageLimit: number | null | undefined,
): boolean {
  if (usageLimit === null || usageLimit === undefined) return true;
  return Number(usedCount) < Number(usageLimit);
}
