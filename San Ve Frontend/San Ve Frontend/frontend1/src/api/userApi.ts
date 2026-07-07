import axiosClient from './axiosClient';
import type { User } from '../types/user';

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  role?: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword: string;
}

const userApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    axiosClient.get<UserListResponse>('/users', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<User>(`/users/${id}`).then((r) => r.data),

  update: (id: number, data: UpdateUserRequest) =>
    axiosClient.put<User>(`/users/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosClient.delete(`/users/${id}`).then((r) => r.data),

  changeRole: (id: number, role: 'user' | 'admin') =>
    axiosClient.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  // ── Profile ──────────────────────────────────────────────────────────
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient
      .post<{ avatarUrl: string }>('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  changePassword: (data: ChangePasswordRequest) =>
    axiosClient.patch('/users/me/password', data).then((r) => r.data),

  changeEmail: (data: ChangeEmailRequest) =>
    axiosClient.patch<{ email: string }>('/users/me/email', data).then((r) => r.data),
};

export default userApi;
