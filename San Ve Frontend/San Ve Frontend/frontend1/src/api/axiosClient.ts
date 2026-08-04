import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';

// FIX BUG-07: `_retry` không tồn tại trong InternalAxiosRequestConfig.
// Khai báo type mở rộng thay vì truy cập field "lậu" trên object -> build production
// với `strict: true` không còn báo lỗi TS2339.
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function getStoredAccessToken(): string | null {
  const sessionToken = sessionStorage.getItem('accessToken');
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem('accessToken');
  if (legacyToken) {
    sessionStorage.setItem('accessToken', legacyToken);
    localStorage.removeItem('accessToken');
  }
  return legacyToken;
}

function getStoredUserId(): number | null {
  const raw =
    sessionStorage.getItem('user') ??
    localStorage.getItem('user');

  if (!raw) return null;

  try {
    const user = JSON.parse(raw) as {
      id?: number | string;
      userId?: number | string;
    };
    const id = Number(user.id ?? user.userId);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function getJwtSubject(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=');

    const payload = JSON.parse(atob(normalized)) as {
      sub?: number | string;
    };
    const subject = Number(payload.sub);
    return Number.isInteger(subject) && subject > 0
      ? subject
      : null;
  } catch {
    return null;
  }
}

function clearStoredAuth(): void {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

async function requestNewAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        API_BASE_URL + '/auth/refresh',
        {},
        { withCredentials: true },
      )
      .then((response) => response.data?.accessToken ?? null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * Chat streaming dùng fetch nên không đi qua interceptor của axiosClient.
 * Dùng chung đúng cơ chế refresh để không nhân đôi logic token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  return requestNewAccessToken();
}

// NOTE: interceptor response unwrap response.data một lần duy nhất.
// Tất cả các nơi gọi axiosClient KHÔNG được unwrap thêm lần nào nữa.
const axiosClient = axios.create({
  // FIX Lỗi 1: fallback cũ là port 3002 nhưng backend chạy ở 3000 -> mọi request
  // đều thất bại. Giá trị lấy từ config/env.ts (nguồn duy nhất).
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
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
        const newToken = await requestNewAccessToken();
        if (newToken) {
          const expectedUserId = getStoredUserId();
          const refreshedUserId = getJwtSubject(newToken);

          // Refresh cookie là cookie theo origin và có thể bị một tab khác ghi đè.
          // Không bao giờ nhận token của tài khoản khác rồi tiếp tục request.
          if (
            expectedUserId &&
            refreshedUserId &&
            expectedUserId !== refreshedUserId
          ) {
            throw new Error('REFRESH_IDENTITY_MISMATCH');
          }

          sessionStorage.setItem('accessToken', newToken);
          localStorage.removeItem('accessToken');
          originalRequest.headers.Authorization = 'Bearer ' + newToken;
          return axiosClient(originalRequest);
        }
      } catch {
        // refresh thất bại → clear và redirect
      }
      clearStoredAuth();
      window.dispatchEvent(new Event('auth-changed'));
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject({ status, message, raw: error });
  }
);

export default axiosClient;
