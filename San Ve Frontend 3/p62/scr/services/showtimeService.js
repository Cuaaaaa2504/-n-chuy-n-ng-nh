import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

export const showtimeService = {
  // GET /api/admin/showtimes
  getAll: async () => {
    try {
      // const response = await axios.get(`${API_BASE_URL}/admin/showtimes`, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      // return response.data;
      
      // Mock data for development
      return [
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
    } catch (error) {
      throw error;
    }
  },

  // POST /api/admin/showtimes
  create: async (data) => {
    try {
      // const response = await axios.post(`${API_BASE_URL}/admin/showtimes`, data, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      // return response.data;
      return { ...data, id: Date.now() };
    } catch (error) {
      throw error;
    }
  },

  // PUT /api/admin/showtimes/{id}
  update: async (id, data) => {
    try {
      // const response = await axios.put(`${API_BASE_URL}/admin/showtimes/${id}`, data, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      // return response.data;
      return { ...data, id };
    } catch (error) {
      throw error;
    }
  },

  // PATCH /api/admin/showtimes/{id}/cancel
  cancel: async (id) => {
    try {
      // const response = await axios.patch(`${API_BASE_URL}/admin/showtimes/${id}/cancel`, {}, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      // return response.data;
      return { id, status: 'CANCELLED' };
    } catch (error) {
      throw error;
    }
  }
};