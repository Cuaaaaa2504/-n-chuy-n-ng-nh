// src/pages/MyTicketsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketList from '../components/tickets/TicketList';
import EmptyTickets from '../components/tickets/EmptyTickets';
import bookingService from '../services/bookingService';
import '../styles/tickets.css';

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getMyTickets();
      setTickets(response.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách vé. Vui lòng thử lại sau.');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchMyTickets();
  };

  const handleNavigateToMovies = () => {
    navigate('/movies');
  };

  if (loading) {
    return (
      <div className="my-tickets-page">
        <div className="container">
          <h1 className="page-title">Vé của tôi</h1>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Đang tải danh sách vé...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-tickets-page">
        <div className="container">
          <h1 className="page-title">Vé của tôi</h1>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error}</p>
            <button className="btn btn-primary" onClick={handleRetry}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tickets-page">
      <div className="container">
        <h1 className="page-title">Vé của tôi</h1>
        {tickets.length === 0 ? (
          <EmptyTickets onNavigateToMovies={handleNavigateToMovies} />
        ) : (
          <TicketList tickets={tickets} />
        )}
      </div>
    </div>
  );
};

export default MyTicketsPage;