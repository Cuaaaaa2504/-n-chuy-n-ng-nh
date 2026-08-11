import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authMock = vi.hoisted(() => ({
  value: {
    isLoggedIn: false,
    loading: false,
    user: null as null | {
      id: number;
      fullName: string;
      email: string;
      role?: string;
    },
    token: null as string | null,
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

import PrivateRoute from '../src/routes/PrivateRoute';
import AdminRouteGuard from '../src/routes/AdminRouteGuard';
import StaffRouteGuard from '../src/routes/StaffRouteGuard';

describe('Router/phân quyền', () => {
  beforeEach(() => {
    authMock.value.isLoggedIn = false;
    authMock.value.loading = false;
    authMock.value.user = null;
    authMock.value.token = null;
  });

  it('chuyển khách chưa đăng nhập từ route riêng tư sang đăng nhập', async () => {
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>TRANG_DANG_NHAP</div>} />
          <Route element={<PrivateRoute />}>
            <Route path="/secret" element={<div>NOI_DUNG_RIENG</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('TRANG_DANG_NHAP'),
    ).toBeInTheDocument();
    expect(screen.queryByText('NOI_DUNG_RIENG')).not.toBeInTheDocument();
  });

  it('chuyển người dùng thường khỏi trang quản trị', async () => {
    authMock.value.isLoggedIn = true;
    authMock.value.token = 'user-token';
    authMock.value.user = {
      id: 1,
      fullName: 'Người dùng',
      email: 'user@cmc.com',
      role: 'USER',
    };

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/forbidden" element={<div>CAM_TRUY_CAP</div>} />
          <Route element={<AdminRouteGuard />}>
            <Route path="/admin" element={<div>TRANG_ADMIN</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('CAM_TRUY_CAP')).toBeInTheDocument();
    expect(screen.queryByText('TRANG_ADMIN')).not.toBeInTheDocument();
  });

  it('cho phép ADMIN truy cập route dành cho STAFF', () => {
    authMock.value.isLoggedIn = true;
    authMock.value.token = 'admin-token';
    authMock.value.user = {
      id: 2,
      fullName: 'Quản trị viên',
      email: 'admin@cmc.com',
      role: 'ADMIN',
    };

    render(
      <MemoryRouter initialEntries={['/staff/checkin']}>
        <Routes>
          <Route path="/login" element={<div>TRANG_DANG_NHAP</div>} />
          <Route path="/forbidden" element={<div>CAM_TRUY_CAP</div>} />
          <Route element={<StaffRouteGuard />}>
            <Route
              path="/staff/checkin"
              element={<div>TRANG_CHECKIN</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('TRANG_CHECKIN')).toBeInTheDocument();
  });
});
