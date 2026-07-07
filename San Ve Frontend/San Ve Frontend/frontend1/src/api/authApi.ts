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
    axiosClient.post<AuthResponse>('/auth/login', data) as unknown as Promise<AuthResponse>,

  register: (data: RegisterRequest) =>
    axiosClient.post<AuthResponse>('/auth/register', data) as unknown as Promise<AuthResponse>,

  logout: () =>
    axiosClient.post('/auth/logout'),

  getMe: () =>
    axiosClient.get<User>('/auth/me') as unknown as Promise<User>,

  refreshToken: () =>
    axiosClient.post<{ accessToken: string }>('/auth/refresh') as unknown as Promise<{ accessToken: string }>,
};

export default authApi;
