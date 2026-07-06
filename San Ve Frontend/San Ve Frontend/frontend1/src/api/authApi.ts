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
  login: (data: LoginRequest) =>
    axiosClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    axiosClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  logout: () =>
    axiosClient.post('/auth/logout').then((r) => r.data),

  getMe: () =>
    axiosClient.get<User>('/auth/me').then((r) => r.data),

  refreshToken: () =>
    axiosClient.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data),
};

export default authApi;
