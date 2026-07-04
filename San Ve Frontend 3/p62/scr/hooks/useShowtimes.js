import { useState } from 'react';
import { showtimeService } from '../services/showtimeService';

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchShowtimes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data - Replace with actual API call
      const mockData = [
        {
          id: 1,
          movieTitle: 'Avengers Endgame',
          cinemaName: 'CGV Vincom',
          roomName: 'Room 1',
          showDate: '2026-06-25',
          startTime: '19:30',
          endTime: '22:30',
          status: 'ACTIVE'
        },
        {
          id: 2,
          movieTitle: 'Avatar 2',
          cinemaName: 'Lotte Cinema',
          roomName: 'Room 2',
          showDate: '2026-06-26',
          startTime: '20:00',
          endTime: '23:00',
          status: 'ACTIVE'
        }
      ];
      setShowtimes(mockData);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const addShowtime = async (data) => {
    try {
      // Mock API call
      const newShowtime = {
        id: Date.now(),
        ...data,
        cinemaName: 'CGV Vincom',
        status: 'ACTIVE'
      };
      setShowtimes(prev => [...prev, newShowtime]);
      return true;
    } catch (err) {
      setError('Không thể thêm suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  const updateShowtime = async (id, data) => {
    try {
      // Mock API call
      setShowtimes(prev => 
        prev.map(item => 
          item.id === id ? { ...item, ...data } : item
        )
      );
      return true;
    } catch (err) {
      setError('Không thể cập nhật suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  const cancelShowtime = async (id) => {
    try {
      // Mock API call
      setShowtimes(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'CANCELLED' } : item
        )
      );
      return true;
    } catch (err) {
      setError('Không thể hủy suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  // Load data on mount
  useState(() => {
    fetchShowtimes();
  }, []);

  return {
    showtimes,
    loading,
    error,
    fetchShowtimes,
    addShowtime,
    updateShowtime,
    cancelShowtime
  };
};