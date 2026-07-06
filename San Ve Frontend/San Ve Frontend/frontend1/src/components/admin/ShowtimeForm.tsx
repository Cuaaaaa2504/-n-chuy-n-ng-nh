// src/components/admin/ShowtimeForm.tsx
import React, { useState } from 'react';

interface ShowtimeData {
  movieId: string;
  roomId: string;
  showDate: string;
  startTime: string;
  endTime: string;
}

interface Props {
  showtime?: ShowtimeData | null;
  onSubmit: (data: ShowtimeData) => void;
  onCancel: () => void;
}

const ShowtimeForm: React.FC<Props> = ({ showtime, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<ShowtimeData>({
    movieId:   showtime?.movieId   || '',
    roomId:    showtime?.roomId    || '',
    showDate:  showtime?.showDate  || '',
    startTime: showtime?.startTime || '',
    endTime:   showtime?.endTime   || '',
  });
  const [errors, setErrors] = useState<Partial<ShowtimeData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ShowtimeData> = {};
    if (!formData.movieId)   newErrors.movieId   = 'Vui lòng chọn phim';
    if (!formData.roomId)    newErrors.roomId    = 'Vui lòng chọn phòng';
    if (!formData.showDate)  newErrors.showDate  = 'Vui lòng chọn ngày chiếu';
    if (!formData.startTime) newErrors.startTime = 'Vui lòng chọn giờ bắt đầu';
    if (!formData.endTime)   newErrors.endTime   = 'Vui lòng chọn giờ kết thúc';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (formData.showDate && new Date(formData.showDate) < today) {
      newErrors.showDate = 'Ngày chiếu phải >= hiện tại';
    }
    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ShowtimeData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  return (
    <form className="showtime-form" onSubmit={handleSubmit}>
      <h3>{showtime ? 'Sửa suất chiếu' : 'Thêm suất chiếu mới'}</h3>

      <div className="form-group">
        <label htmlFor="movieId">Phim</label>
        <select id="movieId" name="movieId" value={formData.movieId} onChange={handleChange} className={errors.movieId ? 'error' : ''}>
          <option value="">Chọn phim</option>
          <option value="1">Avengers Endgame</option>
          <option value="2">Avatar 2</option>
          <option value="3">Spider-Man</option>
        </select>
        {errors.movieId && <span className="error-message">{errors.movieId}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="roomId">Phòng</label>
        <select id="roomId" name="roomId" value={formData.roomId} onChange={handleChange} className={errors.roomId ? 'error' : ''}>
          <option value="">Chọn phòng</option>
          <option value="1">Room 1</option>
          <option value="2">Room 2</option>
          <option value="3">Room 3</option>
        </select>
        {errors.roomId && <span className="error-message">{errors.roomId}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="showDate">Ngày chiếu</label>
        <input type="date" id="showDate" name="showDate" value={formData.showDate} onChange={handleChange} className={errors.showDate ? 'error' : ''} />
        {errors.showDate && <span className="error-message">{errors.showDate}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startTime">Giờ bắt đầu</label>
          <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleChange} className={errors.startTime ? 'error' : ''} />
          {errors.startTime && <span className="error-message">{errors.startTime}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="endTime">Giờ kết thúc</label>
          <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={handleChange} className={errors.endTime ? 'error' : ''} />
          {errors.endTime && <span className="error-message">{errors.endTime}</span>}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Hủy</button>
        <button type="submit" className="btn btn-primary">{showtime ? 'Cập nhật' : 'Thêm mới'}</button>
      </div>
    </form>
  );
};

export default ShowtimeForm;
