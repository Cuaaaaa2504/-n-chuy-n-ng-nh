// src/services/bookingService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const bookingService = {
  getMyTickets: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/bookings/my-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Lỗi khi lấy danh sách vé');
      } else if (error.request) {
        throw new Error('Không thể kết nối đến máy chủ');
      } else {
        throw new Error('Đã xảy ra lỗi không xác định');
      }
    }
  }
};

export default bookingService;