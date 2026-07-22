import api from '../config/api';

const bookingService = {
  getBookings: (params, signal) =>
    api.get('/admin/bookings', { params, signal }).then((r) => r.data),

  getBooking: (id) => api.get(`/admin/bookings/${id}`).then((r) => r.data),

  updateStatus: (id, status) =>
    api.patch(`/admin/bookings/${id}/status`, { status }).then((r) => r.data),
};

export default bookingService;
