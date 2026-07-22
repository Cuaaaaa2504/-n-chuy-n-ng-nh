export function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN') + ' ₫';
}

export function formatSeats(seats) {
  if (!Array.isArray(seats) || seats.length === 0) return '—';
  return seats.filter(Boolean).join(', ');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
}

export const orDash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
