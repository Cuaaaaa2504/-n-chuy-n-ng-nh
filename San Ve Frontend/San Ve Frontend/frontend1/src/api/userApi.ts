import axiosClient from './axiosClient';
import type { User, UserRole } from '../types/user';

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  role?: UserRole;
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
    axiosClient.get<UserListResponse>('/users', { params }) as unknown as Promise<UserListResponse>,

  getById: (id: number) =>
    axiosClient.get<User>(`/users/${id}`) as unknown as Promise<User>,

  update: (id: number, data: UpdateUserRequest) =>
    axiosClient.put<User>(`/users/${id}`, data) as unknown as Promise<User>,

  delete: (id: number) =>
    axiosClient.delete(`/users/${id}`),

  changeRole: (id: number, role: UserRole) =>
    axiosClient.patch<User>(`/users/${id}/role`, { role }) as unknown as Promise<User>,

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post<{ avatarUrl: string }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{ avatarUrl: string }>;
  },

  changePassword: (data: ChangePasswordRequest) =>
    axiosClient.patch('/users/me/password', data),

  changeEmail: (data: ChangeEmailRequest) =>
    axiosClient.patch<{ email: string }>('/users/me/email', data) as unknown as Promise<{ email: string }>,
};

export default userApi;
