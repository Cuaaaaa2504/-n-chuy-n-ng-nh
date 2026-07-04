// src/services/paymentService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const paymentService = {
  // Lấy thông tin đặt vé
  async getBooking(bookingId) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin đơn hàng');
      }

      const data = await response.json();
      
      // Transform dữ liệu từ API sang format của UI
      return this.transformBookingData(data);
    } catch (error) {
      console.error('Get booking error:', error);
      throw error;
    }
  },

  // Xử lý thanh toán
  async processPayment(paymentData) {
    try {
      // Giả lập API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 85% thành công
          if (Math.random() < 0.85) {
            resolve({
              status: 'SUCCESS',
              transactionId: `TXN${Date.now()}`,
              timestamp: new Date().toISOString()
            });
          } else {
            reject(new Error('Thanh toán thất bại'));
          }
        }, 2000);
      });

      // Trong thực tế sẽ gọi API thực
      // const response = await fetch(`${API_BASE_URL}/payments`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(paymentData),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Thanh toán thất bại');
      // }
      // 
      // return await response.json();

      return {
        status: 'SUCCESS',
        transactionId: `TXN${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Payment error:', error);
      throw error;
    }
  },

  // Transform dữ liệu từ API
  transformBookingData(data) {
    return {
      id: data.bookingId || data.id,
      movie: {
        name: data.movieName || data.movie,
        poster: data.poster || 'https://via.placeholder.com/300x450',
        duration: data.duration || 120,
        genre: data.genre || 'N/A',
        ageRestriction: data.ageRestriction || null,
        description: data.description || ''
      },
      cinema: {
        name: data.cinemaName || data.cinema,
        address: data.cinemaAddress || '',
        room: data.room || 'N/A'
      },
      showtime: {
        date: data.showtime || new Date().toISOString()
      },
      seats: data.seats?.map(seat => ({
        id: seat,
        row: seat.charAt(0),
        number: parseInt(seat.substring(1)),
        price: data.seatPrice || 90000
      })) || [],
      totalPrice: data.totalPrice || 0,
      status: data.status || 'PENDING'
    };
  }
};