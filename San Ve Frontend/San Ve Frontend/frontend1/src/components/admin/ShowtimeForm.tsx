// src/components/admin/ShowtimeForm.tsx
// FIX BUG-01/WARN-02: chuyển sang Tailwind, dùng chung Field/inputClass/Btn của AdminUI.
// FIX BUG-04: dropdown Phim / Phòng đổ từ dữ liệu thật (props movies, rooms),
//             không còn 3 option hardcode 'Avengers Endgame' / 'Room 1'.
import React, { useMemo, useState } from 'react';
import { Btn, Field } from './AdminUI';
import { inputClass } from './adminUiHelpers';
import type { MovieOption, RoomOption, ShowtimeFormData } from '../../types/showtime';

interface Props {
  showtime?: ShowtimeFormData | null;
  movies: MovieOption[];
  rooms: RoomOption[];
  onSubmit: (data: ShowtimeFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
}

type FormErrors = Partial<Record<keyof ShowtimeFormData, string>>;

const EMPTY: ShowtimeFormData = {
  movieId: '',
  roomId: '',
  showDate: '',
  startTime: '',
  endTime: '',
  basePrice: '',
};

const ShowtimeForm: React.FC<Props> = ({
  showtime,
  movies,
  rooms,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const [formData, setFormData] = useState<ShowtimeFormData>({ ...EMPTY, ...showtime });
  const [errors, setErrors] = useState<FormErrors>({});

  // Nhóm phòng theo rạp để admin không bị rối khi có nhiều rạp
  const roomsByCinema = useMemo(() => {
    const map = new Map<string, RoomOption[]>();
    rooms.forEach((r) => {
      const key = r.cinemaName || 'Khác';
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [rooms]);

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    if (!formData.movieId) next.movieId = 'Vui lòng chọn phim';
    if (!formData.roomId) next.roomId = 'Vui lòng chọn phòng';
    if (!formData.showDate) next.showDate = 'Vui lòng chọn ngày chiếu';
    if (!formData.startTime) next.startTime = 'Vui lòng chọn giờ bắt đầu';
    if (!formData.endTime) next.endTime = 'Vui lòng chọn giờ kết thúc';

    // FIX: basePrice là cột NOT NULL ở backend — trước đây form không hề có ô này
    // nên mọi request tạo suất chiếu đều bị ValidationPipe từ chối.
    if (formData.basePrice === '' || Number.isNaN(Number(formData.basePrice))) {
      next.basePrice = 'Vui lòng nhập giá vé cơ bản';
    } else if (Number(formData.basePrice) <= 0) {
      next.basePrice = 'Giá vé phải lớn hơn 0';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (formData.showDate && new Date(formData.showDate) < today) {
      next.showDate = 'Ngày chiếu phải từ hôm nay trở đi';
    }
    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      next.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ShowtimeFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  const err = (field: keyof ShowtimeFormData) =>
    errors[field] ? (
      <span className="block text-xs text-red-400 mt-1">{errors[field]}</span>
    ) : null;

  const ring = (field: keyof ShowtimeFormData) =>
    errors[field] ? ' border-red-500 focus:ring-red-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Phim">
        <select
          name="movieId"
          value={formData.movieId}
          onChange={handleChange}
          className={inputClass + ring('movieId')}
        >
          <option value="">— Chọn phim —</option>
          {movies.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.title}
            </option>
          ))}
        </select>
        {movies.length === 0 && (
          <span className="block text-xs text-yellow-400 mt-1">
            Chưa tải được danh sách phim. Kiểm tra kết nối tới backend.
          </span>
        )}
        {err('movieId')}
      </Field>

      <Field label="Phòng chiếu">
        <select
          name="roomId"
          value={formData.roomId}
          onChange={handleChange}
          className={inputClass + ring('roomId')}
        >
          <option value="">— Chọn phòng —</option>
          {roomsByCinema.map(([cinemaName, list]) => (
            <optgroup key={cinemaName} label={cinemaName}>
              {list.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {rooms.length === 0 && (
          <span className="block text-xs text-yellow-400 mt-1">
            Chưa tải được danh sách phòng chiếu.
          </span>
        )}
        {err('roomId')}
      </Field>

      <Field label="Ngày chiếu">
        <input
          type="date"
          name="showDate"
          value={formData.showDate}
          onChange={handleChange}
          className={inputClass + ring('showDate')}
        />
        {err('showDate')}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Giờ bắt đầu">
          <input
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className={inputClass + ring('startTime')}
          />
          {err('startTime')}
        </Field>
        <Field label="Giờ kết thúc">
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className={inputClass + ring('endTime')}
          />
          {err('endTime')}
        </Field>
      </div>

      <Field label="Giá vé cơ bản (₫)">
        <input
          type="number"
          name="basePrice"
          min={0}
          step={1000}
          placeholder="75000"
          value={formData.basePrice}
          onChange={handleChange}
          className={inputClass + ring('basePrice')}
        />
        {err('basePrice')}
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Btn variant="ghost" onClick={onCancel}>
          Hủy
        </Btn>
        <Btn type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : showtime ? 'Cập nhật' : 'Thêm mới'}
        </Btn>
      </div>
    </form>
  );
};

export default ShowtimeForm;
