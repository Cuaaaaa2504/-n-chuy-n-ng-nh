import { todayKey, toMinutes, minutesToHHMM, isOverlapping } from './datetime';

export const CLEANING_MINUTES = 15;

export function suggestEndTime(startTime, durationMinutes) {
  const start = toMinutes(startTime);
  if (!Number.isFinite(start) || !Number.isFinite(Number(durationMinutes))) return '';
  return minutesToHHMM(start + Number(durationMinutes));
}

export function validateShowtime(form, { movies = [], showtimes = [] } = {}) {
  const errors = {};

  if (!form.cinemaId) errors.cinemaId = 'Vui lòng chọn rạp';
  if (!form.roomId) errors.roomId = 'Vui lòng chọn phòng chiếu';
  if (!form.movieId) errors.movieId = 'Vui lòng chọn phim';
  if (!form.date) errors.date = 'Vui lòng chọn ngày chiếu';
  if (!form.startTime) errors.startTime = 'Vui lòng nhập giờ bắt đầu';
  if (!form.endTime) errors.endTime = 'Vui lòng nhập giờ kết thúc';

  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Giá vé phải lớn hơn 0';

  if (Object.keys(errors).length) return errors;

  if (form.date < todayKey()) {
    errors.date = 'Không thể tạo suất chiếu trong quá khứ';
    return errors;
  }

  const movie = movies.find((m) => String(m.id) === String(form.movieId));
  if (movie) {
    if (movie.releaseDate && form.date < String(movie.releaseDate).slice(0, 10)) {
      errors.date = `Phim khởi chiếu từ ${movie.releaseDate}`;
    }
    if (movie.endDate && form.date > String(movie.endDate).slice(0, 10)) {
      errors.date = `Phim kết thúc công chiếu ngày ${movie.endDate}`;
    }

    const duration = Number(movie.durationMinutes);
    if (Number.isFinite(duration)) {
      const start = toMinutes(form.startTime);
      let end = toMinutes(form.endTime);
      if (end <= start) end += 1440; // suất qua đêm
      const actual = end - start;
      if (actual < duration) {
        errors.endTime = `Thời lượng phim là ${duration} phút, suất chiếu chỉ có ${actual} phút`;
      } else if (actual > duration + 60) {
        errors.endTime = 'Suất chiếu dài bất thường so với thời lượng phim';
      }
    }
  }

  if (isOverlapping(form, showtimes, CLEANING_MINUTES)) {
    errors.startTime =
      `Phòng này đã có suất chiếu trùng giờ (cần cách nhau ít nhất ${CLEANING_MINUTES} phút để dọn phòng)`;
  }

  return errors;
}
