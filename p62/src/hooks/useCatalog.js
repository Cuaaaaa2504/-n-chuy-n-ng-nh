import { useEffect, useState } from 'react';
import catalogService from '../services/catalogService';

// Phim / phòng / rạp lấy từ API, không hardcode trong form nữa.
export default function useCatalog(cinemaId) {
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([catalogService.getMovies(controller.signal), catalogService.getCinemas(controller.signal)])
      .then(([m, c]) => { setMovies(m || []); setCinemas(c || []); setError(null); })
      .catch((err) => { if (err.status !== undefined) setError(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cinemaId) { setRooms([]); return undefined; }
    const controller = new AbortController();
    catalogService.getRooms(cinemaId, controller.signal)
      .then((r) => setRooms(r || []))
      .catch((err) => { if (err.status !== undefined) setError(err); });
    return () => controller.abort();
  }, [cinemaId]);

  return { movies, cinemas, rooms, loading, error };
}
