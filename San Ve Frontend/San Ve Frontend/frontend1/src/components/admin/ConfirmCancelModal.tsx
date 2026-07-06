// src/components/admin/ConfirmCancelModal.tsx
import React from 'react';

interface Showtime {
  movieTitle?: string;
  showDate?: string;
  startTime?: string;
  endTime?: string;
}

interface Props {
  showtime: Showtime | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmCancelModal: React.FC<Props> = ({ showtime, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content confirm-modal">
        <h3>Xác nhận hủy suất chiếu</h3>
        <p>Bạn có chắc chắn muốn hủy suất chiếu này?</p>
        <div className="showtime-info">
          <p><strong>Phim:</strong> {showtime?.movieTitle}</p>
          <p><strong>Ngày:</strong> {showtime?.showDate}</p>
          <p><strong>Giờ:</strong> {showtime?.startTime} - {showtime?.endTime}</p>
        </div>
        <p className="warning-text">⚠️ Hành động này không thể hoàn tác</p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Hủy bỏ</button>
          <button className="btn btn-danger" onClick={onConfirm}>Xác nhận hủy</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCancelModal;
