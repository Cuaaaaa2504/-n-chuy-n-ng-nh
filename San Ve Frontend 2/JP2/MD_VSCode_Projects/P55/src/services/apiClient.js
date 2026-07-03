import axios from 'axios';
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api', timeout: 10000 });
apiClient.interceptors.request.use((config) => { const token = localStorage.getItem('accessToken'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
apiClient.interceptors.response.use((res) => res.data, (err) => Promise.reject({ status: err.response?.status, message: err.response?.data?.message || err.message || 'Có lỗi xảy ra' }));
export default apiClient;
