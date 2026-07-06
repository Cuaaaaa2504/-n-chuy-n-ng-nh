// src/components/admin/ShowtimeTable.tsx
import React from 'react';
import type { Showtime } from '../../hooks/useShowtimes';

interface Props {
  showtimes: Showtime[];
  onEdit: (showtime: Showtime) => void;
  onCancel: (showtime: Showtime) => void;
}

const ShowtimeTable: React.FC<Props> = ({ showtimes, onEdit, onCancel }) => {
  const getStatusBadge = (status: Showtime['status']) => {
    const statusMap = {
      ACTIVE:    { label: 'Đang hoạt động', className: 'status-active' },
      CANCELLED: { label: 'Đã hủy',         className: 'status-cancelled' },
      FINISHED:  { label: 'Đã kết thúc',    className: 'status-finished' },
    };
    const info = statusMap[status] ?? statusMap.ACTIVE;
    return <span className={`status-badge ${info.className}`}>{info.label}</span>;
  };

  const isDisabled = (status: Showtime['status']) =>
    status === 'CANCELLED' || status === 'FINISHED';

  return (
    <div className="table-container">
      {/* Desktop */}
      <table className="admin-table desktop-table">
        <thead>
          <tr>
            <th>ID</th><th>Phim</th><th>Rạp</th><th>Phòng</th>
            <th>Ngày</th><th>Giờ bắt đầu</th><th>Giờ kết thúc</th>
            <th>Trạng thái</th><th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {showtimes.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.movieTitle}</td>
              <td>{s.cinemaName}</td>
              <td>{s.roomName}</td>
              <td>{s.showDate}</td>
              <td>{s.startTime}</td>
              <td>{s.endTime}</td>
              <td>{getStatusBadge(s.status)}</td>
              <td>
                <div className="action-buttons">
                  <button className="btn btn-edit" onClick={() => onEdit(s)} disabled={isDisabled(s.status)}>Sửa</button>
                  <button className="btn btn-cancel" onClick={() => onCancel(s)} disabled={isDisabled(s.status)}>Hủy</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="mobile-cards">
        {showtimes.map((s) => (
          <div key={s.id} className="card-item">
            <div className="card-header"><span className="card-id">#{s.id}</span>{getStatusBadge(s.status)}</div>
            <div className="card-body">
              <div className="card-row"><span className="card-label">Phim:</span><span className="card-value">{s.movieTitle}</span></div>
              <div className="card-row"><span className="card-label">Rạp:</span><span className="card-value">{s.cinemaName}</span></div>
              <div className="card-row"><span className="card-label">Phòng:</span><span className="card-value">{s.roomName}</span></div>
              <div className="card-row"><span className="card-label">Ngày:</span><span className="card-value">{s.showDate}</span></div>
              <div className="card-row"><span className="card-label">Giờ:</span><span className="card-value">{s.startTime} - {s.endTime}</span></div>
            </div>
            <div className="card-actions">
              <button className="btn btn-edit full-width" onClick={() => onEdit(s)} disabled={isDisabled(s.status)}>Sửa</button>
              <button className="btn btn-cancel full-width" onClick={() => onCancel(s)} disabled={isDisabled(s.status)}>Hủy</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowtimeTable;
