import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmptyShowtime.css';

const EmptyShowtime = () => {
  const navigate = useNavigate();

  return (
    <div className="empty-showtime-container">
      <div className="empty-icon">🎬</div>
      <h3>Phim hiện chưa có lịch chiếu</h3>
      <p>Vui lòng quay lại sau để xem các suất chiếu mới nhất.</p>
      <div className="empty-suggestions">
        <span>💡 Gợi ý:</span>
        <ul>
          <li>Kiểm tra lại phim khác</li>
          <li>Quay lại sau vài ngày</li>
          <li>Xem các phim đang chiếu khác</li>
        </ul>
      </div>
      <div className="empty-actions">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Quay lại
        </button>
        <button onClick={() => navigate('/')} className="home-btn">
          🏠 Trang chủ
        </button>
      </div>
    </div>
  );
};

export default EmptyShowtime;