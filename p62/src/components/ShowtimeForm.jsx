import { useEffect, useMemo, useState } from 'react';
import useCatalog from '../hooks/useCatalog';
import { validateShowtime, suggestEndTime } from '../utils/showtimeValidation';
import { todayKey } from '../utils/datetime';
import { LoadingState } from './DataState';

// Chuẩn hóa dữ liệu từ API về đúng shape của form.
// API trả movieTitle/roomName nhưng form cần movieId/roomId -> phải map,
// nếu không nút "Sửa" sẽ mở ra form rỗng.
function toFormState(showtime, movies, rooms) {
  if (!showtime) {
    return { cinemaId: '', roomId: '', movieId: '', date: '', startTime: '', endTime: '', price: '' };
  }
  const movieId =
    showtime.movieId ??
    movies.find((m) => m.title === showtime.movieTitle)?.id ??
    '';
  const roomId =
    showtime.roomId ??
    rooms.find((r) => r.name === showtime.roomName)?.id ??
    '';

  return {
    id: showtime.id,
    cinemaId: String(showtime.cinemaId ?? ''),
    roomId: String(roomId),
    movieId: String(movieId),
    date: String(showtime.date ?? '').slice(0, 10),
    startTime: String(showtime.startTime ?? '').slice(0, 5),
    endTime: String(showtime.endTime ?? '').slice(0, 5),
    price: showtime.price ?? '',
  };
}

export default function ShowtimeForm({ showtime, existingShowtimes = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toFormState(showtime, [], []));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const { movies, cinemas, rooms, loading: catalogLoading } = useCatalog(form.cinemaId);

  // Khi catalog tải xong, map lại lần nữa để lấp movieId/roomId còn thiếu.
  useEffect(() => {
    if (catalogLoading) return;
    setForm((prev) => {
      const mapped = toFormState(showtime, movies, rooms);
      return prev.movieId || prev.roomId ? prev : mapped;
    });
  }, [catalogLoading, showtime, movies, rooms]);

  const selectedMovie = useMemo(
    () => movies.find((m) => String(m.id) === String(form.movieId)),
    [movies, form.movieId]
  );

  const setField = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'cinemaId') next.roomId = '';
      // Tự tính giờ kết thúc theo thời lượng phim
      if ((name === 'startTime' || name === 'movieId') && next.startTime) {
        const movie = movies.find((m) => String(m.id) === String(next.movieId));
        if (movie?.durationMinutes) {
          next.endTime = suggestEndTime(next.startTime, movie.durationMinutes);
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateShowtime(form, { movies, showtimes: existingShowtimes });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Không gửi id do client sinh. Backend chịu trách nhiệm sinh id.
      await onSubmit({
        cinemaId: form.cinemaId,
        roomId: form.roomId,
        movieId: form.movieId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        price: Number(form.price),
      });
    } catch (err) {
      setSubmitError(err?.message || 'Lưu suất chiếu thất bại.');
      if (err?.fieldErrors) setErrors(err.fieldErrors);
      setSubmitting(false);
    }
  };

  if (catalogLoading) return <LoadingState label="Đang tải danh mục phim & phòng…" />;

  return (
    <form className="showtime-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <label htmlFor="cinemaId">Rạp *</label>
        <select id="cinemaId" value={form.cinemaId}
                onChange={(e) => setField('cinemaId', e.target.value)}
                aria-invalid={!!errors.cinemaId}>
          <option value="">— Chọn rạp —</option>
          {cinemas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.cinemaId && <p className="form-error">{errors.cinemaId}</p>}
      </div>

      <div className="form-row">
        <label htmlFor="roomId">Phòng chiếu *</label>
        <select id="roomId" value={form.roomId} disabled={!form.cinemaId}
                onChange={(e) => setField('roomId', e.target.value)}
                aria-invalid={!!errors.roomId}>
          <option value="">{form.cinemaId ? '— Chọn phòng —' : 'Chọn rạp trước'}</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {errors.roomId && <p className="form-error">{errors.roomId}</p>}
      </div>

      <div className="form-row">
        <label htmlFor="movieId">Phim *</label>
        <select id="movieId" value={form.movieId}
                onChange={(e) => setField('movieId', e.target.value)}
                aria-invalid={!!errors.movieId}>
          <option value="">— Chọn phim —</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}{m.durationMinutes ? ` (${m.durationMinutes} phút)` : ''}
            </option>
          ))}
        </select>
        {errors.movieId && <p className="form-error">{errors.movieId}</p>}
        {selectedMovie?.releaseDate && (
          <p className="form-hint">
            Công chiếu: {selectedMovie.releaseDate}
            {selectedMovie.endDate ? ` → ${selectedMovie.endDate}` : ''}
          </p>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="date">Ngày chiếu *</label>
        <input id="date" type="date" value={form.date} min={todayKey()}
               onChange={(e) => setField('date', e.target.value)}
               aria-invalid={!!errors.date} />
        {errors.date && <p className="form-error">{errors.date}</p>}
      </div>

      <div className="form-grid-2">
        <div className="form-row">
          <label htmlFor="startTime">Giờ bắt đầu *</label>
          <input id="startTime" type="time" value={form.startTime}
                 onChange={(e) => setField('startTime', e.target.value)}
                 aria-invalid={!!errors.startTime} />
          {errors.startTime && <p className="form-error">{errors.startTime}</p>}
        </div>
        <div className="form-row">
          <label htmlFor="endTime">Giờ kết thúc *</label>
          <input id="endTime" type="time" value={form.endTime}
                 onChange={(e) => setField('endTime', e.target.value)}
                 aria-invalid={!!errors.endTime} />
          {errors.endTime && <p className="form-error">{errors.endTime}</p>}
          <p className="form-hint">Suất qua đêm (23:00 → 01:00) được chấp nhận.</p>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="price">Giá vé (₫) *</label>
        <input id="price" type="number" min="0" step="1000" value={form.price}
               onChange={(e) => setField('price', e.target.value)}
               aria-invalid={!!errors.price} />
        {errors.price && <p className="form-error">{errors.price}</p>}
      </div>

      {submitError && <p className="form-error" role="alert">{submitError}</p>}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu…' : showtime ? 'Cập nhật' : 'Thêm suất chiếu'}
        </button>
      </div>
    </form>
  );
}
