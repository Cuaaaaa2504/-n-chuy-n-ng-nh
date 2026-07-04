// src/components/tickets/EmptyTickets.jsx
import React from 'react';

const EmptyTickets = ({ onNavigateToMovies }) => {
  return (
    <div className="empty-tickets">
      <div className="empty-icon">🎫</div>
      <h2>Bạn chưa có vé nào.</h2>
      <p>Hãy đặt vé để trải nghiệm những bộ phim hấp dẫn.</p>
      <button className="btn btn-primary" onClick={onNavigateToMovies}>
        Đặt vé ngay
      </button>
    </div>
  );
};

export default EmptyTickets;