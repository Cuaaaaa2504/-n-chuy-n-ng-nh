import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';

// FIX BUG-07: `_retry` không tồn tại trong InternalAxiosRequestConfig.
// Khai báo type mở rộng thay vì truy cập field "lậu" trên object -> build production
// với `strict: true` không còn báo lỗi TS2339.
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// NOTE: interceptor response unwrap response.data một lần duy nhất.
// Tất cả các nơi gọi axiosClient KHÔNG được unwrap thêm lần nào nữa.
const axiosClient = axios.create({
  // FIX Lỗi 1: fallback cũ là port 3002 nhưng backend chạy ở 3000 -> mọi request
  // đều thất bại. Giá trị lấy từ config/env.ts (nguồn duy nhất).
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const message: string =
      error.response?.data?.message || error.message || 'Có lỗi xảy ra';
    console.error('[API ERROR]', { status, message, url: originalRequest?.url });

    if (status === 401 && originalRequest && !originalRequest._retry) {
      try {
        originalRequest._retry = true;
        const res = await axios.post(
          API_BASE_URL + '/auth/refresh',
          {},
          { withCredentials: true },
        );
        const newToken = res.data?.accessToken;
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          originalRequest.headers.Authorization = 'Bearer ' + newToken;
          return axiosClient(originalRequest);
        }
      } catch {
        // refresh thất bại → clear và redirect
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-changed'));
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject({ status, message, raw: error });
  }
);

export default axiosClient;
