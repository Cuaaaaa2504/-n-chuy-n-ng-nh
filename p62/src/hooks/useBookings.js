import { useCallback, useEffect, useRef, useState } from 'react';
import bookingService from '../services/bookingService';

export default function useBookings(filters = {}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const filterKey = JSON.stringify(filters);

  const fetchBookings = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      // Filters được gửi thẳng lên server, không còn là "trang trí".
      const data = await bookingService.getBookings(JSON.parse(filterKey), controller.signal);
      setBookings(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      if (err?.status === undefined) return;
      setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchBookings();
    return () => controllerRef.current?.abort();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}
