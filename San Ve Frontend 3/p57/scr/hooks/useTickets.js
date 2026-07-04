// src/hooks/useTickets.js
import { useState, useEffect } from 'react';
import bookingService from '../services/bookingService';

const useTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getMyTickets();
      setTickets(response.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return { tickets, loading, error, refetch: fetchTickets };
};

export default useTickets;