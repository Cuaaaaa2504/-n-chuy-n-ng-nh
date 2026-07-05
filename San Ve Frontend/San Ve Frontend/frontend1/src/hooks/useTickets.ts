// src/hooks/useTickets.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Ticket {
  id: string | number;
  bookingCode?: string;
  movieTitle: string;
  cinemaName?: string;
  showDate?: string;
  showTime?: string;
  seats?: string[];
  totalAmount?: number;
  status?: string;
}

const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]); // ✅ thay any[] → Ticket[]
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const hasFetched            = useRef(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<Ticket[]>(`${BASE}/bookings/my-tickets`);
      setTickets(data ?? []);
    } catch (err: unknown) { // ✅ thay any → unknown
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách vé');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Dùng ref guard — fetchTickets chạy trong Promise, không phải sync body
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, error, refetch: fetchTickets };
};

export default useTickets;
