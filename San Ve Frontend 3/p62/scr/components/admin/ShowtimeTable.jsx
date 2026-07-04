import React from 'react';

const ShowtimeTable = ({ showtimes, onEdit, onCancel }) => {
  const getStatusBadge = (status) => {
    const statusMap = {
      ACTIVE: { label: 'Đang hoạt động', className: 'status-active' },
      CANCELLED: { label: 'Đã hủy', className: 'status-cancelled' },
      FINISHED: { label: 'Đã kết thúc', className: 'status-finished' }
    };
    const statusInfo = statusMap[status] || statusMap.ACTIVE;
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const isDisabled = (status) => {
    return status === 'CANCELLED' || status === 'FINISHED';
  };

  return (
    <div className="table-container">
      {/* Desktop Table */}
      <table className="admin-table desktop-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Phim</th>
            <th>Rạp</th>
            <th>Phòng</th>
            <th>Ngày</th>
            <th>Giờ bắt đầu</th>
            <th>Giờ kết thúc</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {showtimes.map((showtime) => (
            <tr key={showtime.id}>
              <td>{showtime.id}</td>
              <td>{showtime.movieTitle}</td>
              <td>{showtime.cinemaName}</td>
              <td>{showtime.roomName}</td>
              <td>{showtime.showDate}</td>
              <td>{showtime.startTime}</td>
              <td>{showtime.endTime}</td>
              <td>{getStatusBadge(showtime.status)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn btn-edit"
                    onClick={() => onEdit(showtime)}
                    disabled={isDisabled(showtime.status)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn btn-cancel"
                    onClick={() => onCancel(showtime)}
                    disabled={isDisabled(showtime.status)}
                  >
                    Hủy
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="mobile-cards">
        {showtimes.map((showtime) => (
          <div key={showtime.id} className="card-item">
            <div className="card-header">
              <span className="card-id">#{showtime.id}</span>
              {getStatusBadge(showtime.status)}
            </div>
            <div className="card-body">
              <div className="card-row">
                <span className="card-label">Phim:</span>
                <span className="card-value">{showtime.movieTitle}</span>
              </div>
              <div className="card-row">
                <span className="card-label">Rạp:</span>
                <span className="card-value">{showtime.cinemaName}</span>
              </div>
              <div className="card-row">
                <span className="card-label">Phòng:</span>
                <span className="card-value">{showtime.roomName}</span>
              </div>
              <div className="card-row">
                <span className="card-label">Ngày:</span>
                <span className="card-value">{showtime.showDate}</span>
              </div>
              <div className="card-row">
                <span className="card-label">Giờ bắt đầu:</span>
                <span className="card-value">{showtime.startTime}</span>
              </div>
              <div className="card-row">
                <span className="card-label">Giờ kết thúc:</span>
                <span className="card-value">{showtime.endTime}</span>
              </div>
            </div>
            <div className="card-actions">
              <button
                className="btn btn-edit full-width"
                onClick={() => onEdit(showtime)}
                disabled={isDisabled(showtime.status)}
              >
                Sửa
              </button>
              <button
                className="btn btn-cancel full-width"
                onClick={() => onCancel(showtime)}
                disabled={isDisabled(showtime.status)}
              >
                Hủy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowtimeTable;