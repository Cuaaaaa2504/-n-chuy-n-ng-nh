import axiosClient from './axiosClient';
import type { User } from '../types/user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> =>
    await axiosClient.post<AuthResponse>('/auth/login', data) as unknown as AuthResponse,

  register: async (data: RegisterRequest): Promise<AuthResponse> =>
    await axiosClient.post<AuthResponse>('/auth/register', data) as unknown as AuthResponse,

  logout: async (): Promise<void> => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Logout vẫn hoàn tất cục bộ khi API không phản hồi.
    }
  },

  getMe: async (): Promise<User> =>
    await axiosClient.get<User>('/auth/me') as unknown as User,

  refreshToken: async (): Promise<{ accessToken: string }> =>
    await axiosClient.post<{ accessToken: string }>('/auth/refresh') as unknown as { accessToken: string },
};

export default authApi;
