// src/types/user.ts

// DB lưu 'CUSTOMER' | 'STAFF' | 'ADMIN'; giữ 'USER' để tương thích code cũ
export type UserRole = 'USER' | 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatarUrl?: string;
  createdAt?: string;
}

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
