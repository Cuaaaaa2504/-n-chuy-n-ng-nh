// src/components/tickets/EmptyTickets.tsx

import React from 'react';

const EmptyTickets: React.FC<{ onNavigateToMovies: () => void }> = ({ onNavigateToMovies }) => (
  <div className="empty-tickets">
    <div className="empty-icon">🎫</div>
    <h3>Bạn chưa có vé nào</h3>
    <p>Hãy đặt vé để xem phim yêu thích của bạn!</p>
    <button className="btn btn-primary" onClick={onNavigateToMovies}>Xem phim ngay</button>
  </div>
);

export default EmptyTickets;
