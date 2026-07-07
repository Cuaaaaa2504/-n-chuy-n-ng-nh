import axios from 'axios';

const axiosClient = axios.create({
  // FIX: bỏ /api trong fallback — backend không có global prefix
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
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
  async (error) => {
    const status = error.response?.status as number | undefined;
    const message: string =
      error.response?.data?.message || error.message || 'Có lỗi xảy ra';
    console.error('[API ERROR]', { status, message, url: error.config?.url });

    if (status === 401 && !error.config?._retry) {
      // FIX: Thử refresh token trước khi redirect login
      try {
        error.config._retry = true;
        const res = await axios.post(
          (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002') + '/auth/refresh',
          {},
          { withCredentials: true },
        );
        const newToken = res.data?.accessToken;
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          error.config.headers.Authorization = 'Bearer ' + newToken;
          return axiosClient(error.config);
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
