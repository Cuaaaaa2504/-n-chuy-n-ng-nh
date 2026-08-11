import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../src/api/axiosClient', () => ({
  default: {
    get: axiosMocks.get,
    post: axiosMocks.post,
  },
}));

import authApi from '../src/api/authApi';

describe('Axios/authentication - authApi', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('đăng nhập gọi đúng endpoint và trả dữ liệu xác thực', async () => {
    const payload = {
      email: 'user@cmc.com',
      password: '123456',
    };
    const response = {
      accessToken: 'access-token',
      user: {
        id: 1,
        fullName: 'Nguyễn Văn A',
        email: 'user@cmc.com',
        role: 'USER',
      },
    };

    axiosMocks.post.mockResolvedValue(response);

    await expect(authApi.login(payload)).resolves.toEqual(response);
    expect(axiosMocks.post).toHaveBeenCalledWith('/auth/login', payload);
  });

  it('đăng ký gọi đúng endpoint và payload', async () => {
    const payload = {
      fullName: 'Nguyễn Văn A',
      email: 'new@cmc.com',
      password: '123456',
      phone: '0912345678',
    };
    const response = {
      accessToken: 'new-token',
      user: {
        id: 2,
        fullName: payload.fullName,
        email: payload.email,
        role: 'USER',
      },
    };

    axiosMocks.post.mockResolvedValue(response);

    await expect(authApi.register(payload)).resolves.toEqual(response);
    expect(axiosMocks.post).toHaveBeenCalledWith('/auth/register', payload);
  });

  it('logout gọi API đăng xuất', async () => {
    axiosMocks.post.mockResolvedValue(undefined);

    await expect(authApi.logout()).resolves.toBeUndefined();
    expect(axiosMocks.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('logout vẫn hoàn tất cục bộ khi API lỗi', async () => {
    axiosMocks.post.mockRejectedValue(new Error('Backend offline'));

    await expect(authApi.logout()).resolves.toBeUndefined();
  });

  it('getMe lấy đúng người dùng hiện tại', async () => {
    const user = {
      id: 3,
      fullName: 'Chu Thị Minh Hạnh',
      email: 'hanh@cmc.com',
      role: 'ADMIN',
    };
    axiosMocks.get.mockResolvedValue(user);

    await expect(authApi.getMe()).resolves.toEqual(user);
    expect(axiosMocks.get).toHaveBeenCalledWith('/auth/me');
  });

  it('refreshToken gọi đúng endpoint và trả access token mới', async () => {
    axiosMocks.post.mockResolvedValue({ accessToken: 'refreshed-token' });

    await expect(authApi.refreshToken()).resolves.toEqual({
      accessToken: 'refreshed-token',
    });
    expect(axiosMocks.post).toHaveBeenCalledWith('/auth/refresh');
  });
});
