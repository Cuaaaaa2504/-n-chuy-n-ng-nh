/**
 * Format số tiền sang định dạng tiền Việt Nam
 * Ví dụ: 150000 → "150.000 ₫"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Format ngày giờ sang định dạng Việt Nam
 * Ví dụ: "2024-07-06T20:00:00" → "20:00 - 06/07/2024"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format chỉ ngày
 * Ví dụ: "2024-07-06T20:00:00" → "06/07/2024"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format chỉ giờ
 * Ví dụ: "2024-07-06T20:00:00" → "20:00"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format thời lượng phim từ phút
 * Ví dụ: 125 → "2h 05p"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  return `${h}h ${String(m).padStart(2, '0')}p`;
}

/**
 * Rút gọn chuỗi văn bản
 * Ví dụ: truncate("Đây là một chuỗi rất dài", 10) → "Đây là mộ..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format số ghế từ mảng
 * Ví dụ: ["A1", "A2", "B3"] → "A1, A2, B3"
 */
export function formatSeats(seats: string[]): string {
  return seats.join(', ');
}
