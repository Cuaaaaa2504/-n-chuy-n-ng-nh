import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const parsedApiTimeout = Number(
  import.meta.env.VITE_API_TIMEOUT_MS ?? 30000,
);
const API_TIMEOUT_MS =
  Number.isFinite(parsedApiTimeout) && parsedApiTimeout >= 5000
    ? parsedApiTimeout
    : 30000;

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

export async function refreshAccessToken(): Promise<string | null> {
  return requestNewAccessToken();
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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
    const timedOut =
      error.code === 'ECONNABORTED' ||
      /timeout/i.test(error.message ?? '');
    const message: string = timedOut
      ? 'Máy chủ phản hồi quá chậm. Hãy kiểm tra backend và SQL Server rồi thử lại.'
      : error.response?.data?.message ||
        error.message ||
        'Có lỗi xảy ra';

    console.error('[API ERROR]', {
      status,
      code: error.code,
      message,
      url: originalRequest?.url,
    });

    if (status === 401 && originalRequest && !originalRequest._retry) {
      try {
        originalRequest._retry = true;
        const newToken = await requestNewAccessToken();
        if (newToken) {
          const expectedUserId = getStoredUserId();
          const refreshedUserId = getJwtSubject(newToken);

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
        // Refresh thất bại; phiên đăng nhập được xóa ở bước tiếp theo.
      }
      clearStoredAuth();
      window.dispatchEvent(new Event('auth-changed'));
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }

    return Promise.reject({
      status,
      code: error.code,
      message,
      raw: error,
    });
  }
);

export default axiosClient;
