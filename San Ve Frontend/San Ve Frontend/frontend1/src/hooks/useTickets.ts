// src/hooks/useTickets.ts

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const useTickets = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(`${BASE}/bookings/my-tickets`);
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách vé');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return { tickets, loading, error, refetch: fetchTickets };
};

export default useTickets;
