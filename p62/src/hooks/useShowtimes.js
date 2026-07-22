import { useCallback, useEffect, useRef, useState } from 'react';
import showtimeService from '../services/showtimeService';

export default function useShowtimes(filters = {}) {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const filterKey = JSON.stringify(filters);

  const fetchShowtimes = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await showtimeService.getShowtimes(JSON.parse(filterKey), controller.signal);
      setShowtimes(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      if (err?.status === undefined) return; // request bị abort
      setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filterKey]);

  // ĐÚNG: useEffect. useState(fn) coi fn là lazy initializer -> gọi ngay
  // trong lúc render, gây "Cannot update a component while rendering".
  useEffect(() => {
    fetchShowtimes();
    return () => controllerRef.current?.abort();
  }, [fetchShowtimes]);

  // Sau khi ghi, LUÔN đọc lại từ server để có movieTitle / roomName / cinemaName
  // đúng theo dữ liệu thật, thay vì tự gán hardcode ở client.
  const createShowtime = useCallback(async (payload) => {
    const created = await showtimeService.createShowtime(payload);
    await fetchShowtimes();
    return created;
  }, [fetchShowtimes]);

  const updateShowtime = useCallback(async (id, payload) => {
    const updated = await showtimeService.updateShowtime(id, payload);
    await fetchShowtimes();
    return updated;
  }, [fetchShowtimes]);

  const cancelShowtime = useCallback(async (id, options) => {
    const result = await showtimeService.cancelShowtime(id, options);
    await fetchShowtimes();
    return result;
  }, [fetchShowtimes]);

  return { showtimes, loading, error, refetch: fetchShowtimes, createShowtime, updateShowtime, cancelShowtime };
}
