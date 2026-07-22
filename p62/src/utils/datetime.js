// Trả về 'YYYY-MM-DD' theo giờ ĐỊA PHƯƠNG (sv-SE cho đúng định dạng ISO).
// Không dùng new Date('2026-06-25') để so sánh vì chuỗi đó parse theo UTC
// -> lệch 1 ngày với người dùng UTC+7.
export const todayKey = () => new Date().toLocaleDateString('sv-SE');

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

export const minutesToHHMM = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const DAY = 24 * 60 * 60 * 1000;

// Suất qua đêm: end <= start nghĩa là kết thúc vào ngày hôm sau.
export function showtimeRange(date, startTime, endTime) {
  const start = new Date(`${date}T${startTime}:00`).getTime();
  let end = new Date(`${date}T${endTime}:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end <= start) end += DAY;
  return { start, end };
}

export function isOverlapping(candidate, others, bufferMinutes = 15) {
  const a = showtimeRange(candidate.date, candidate.startTime, candidate.endTime);
  if (!a) return false;
  const buffer = bufferMinutes * 60 * 1000;

  return others.some((st) => {
    if (String(st.id) === String(candidate.id)) return false;
    if (String(st.roomId) !== String(candidate.roomId)) return false;
    if (st.status === 'CANCELLED') return false;
    const b = showtimeRange(st.date, st.startTime, st.endTime);
    if (!b) return false;
    return a.start < b.end + buffer && b.start < a.end + buffer;
  });
}
