import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  // Token nằm trong cookie httpOnly do backend set -> JS không đọc được,
  // nên không bị đánh cắp qua XSS. Backend cần bật CORS allowCredentials
  // và dùng CSRF token cho các request thay đổi dữ liệu.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function toAppError(error) {
  if (error.code === 'ECONNABORTED') {
    return { status: 0, message: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' };
  }
  if (!error.response) {
    return { status: 0, message: 'Không kết nối được máy chủ.' };
  }
  const { status, data } = error.response;
  const message =
    data?.message ||
    { 400: 'Dữ liệu gửi lên không hợp lệ.',
      401: 'Phiên đăng nhập đã hết hạn.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy dữ liệu.',
      409: 'Dữ liệu đã bị thay đổi bởi người khác.',
      500: 'Máy chủ gặp sự cố.' }[status] ||
    'Đã có lỗi xảy ra.';
  return { status, message, fieldErrors: data?.fieldErrors || null };
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(toAppError(error));
  }
);

export default api;
