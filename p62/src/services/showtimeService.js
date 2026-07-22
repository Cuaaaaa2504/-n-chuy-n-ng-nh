import api from '../config/api';

const showtimeService = {
  getShowtimes: (params, signal) =>
    api.get('/admin/showtimes', { params, signal }).then((r) => r.data),

  // id do BACKEND sinh. Client không tự tạo id.
  createShowtime: (payload) =>
    api.post('/admin/showtimes', payload).then((r) => r.data),

  updateShowtime: (id, payload) =>
    api.put(`/admin/showtimes/${id}`, payload).then((r) => r.data),

  // reason + refund để backend xử lý hoàn tiền & thông báo khách
  cancelShowtime: (id, { reason, refundBookings }) =>
    api.post(`/admin/showtimes/${id}/cancel`, { reason, refundBookings }).then((r) => r.data),

  getAffectedBookings: (id) =>
    api.get(`/admin/showtimes/${id}/bookings/summary`).then((r) => r.data),
};

export default showtimeService;
