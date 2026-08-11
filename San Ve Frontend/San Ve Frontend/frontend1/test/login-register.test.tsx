import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  authLogin: vi.fn(),
  contextLogin: vi.fn(),
  registerPost: vi.fn(),
}));

vi.mock('../src/api/authApi', () => ({
  default: {
    login: mocks.authLogin,
  },
}));

vi.mock('../src/api/axiosClient', () => ({
  default: {
    post: mocks.registerPost,
  },
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    login: mocks.contextLogin,
  }),
}));

vi.mock('../src/components/AuthVisual', () => ({
  default: ({ variant }: { variant: string }) => (
    <div data-testid={`auth-visual-${variant}`} />
  ),
}));

import LoginPage from '../src/pages/LoginPage';
import RegisterPage from '../src/pages/RegisterPage';

type RouterEntry =
  | string
  | {
      pathname: string;
      search?: string;
      state?: unknown;
    };

function renderLogin(entry: RouterEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/my-tickets" element={<div>TRANG_VE_CUA_TOI</div>} />
        <Route path="/" element={<div>TRANG_CHU</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>TRANG_DANG_NHAP</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login/register UI', () => {
  beforeEach(() => {
    mocks.authLogin.mockReset();
    mocks.contextLogin.mockReset();
    mocks.registerPost.mockReset();
  });

  it('hiển thị thông báo khi phiên đăng nhập hết hạn', () => {
    renderLogin('/login?expired=1');

    expect(
      screen.getByText('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'),
    ).toBeInTheDocument();
  });

  it('đăng nhập thành công và quay lại trang được yêu cầu', async () => {
    const user = userEvent.setup();
    const authResponse = {
      accessToken: 'token-123',
      user: {
        id: 7,
        fullName: 'Nguyễn Văn A',
        email: 'user@cmc.com',
        role: 'USER',
      },
    };
    mocks.authLogin.mockResolvedValue(authResponse);

    renderLogin({
      pathname: '/login',
      state: {
        from: {
          pathname: '/my-tickets',
        },
      },
    });

    await user.type(screen.getByLabelText('Email'), 'user@cmc.com');
    await user.type(screen.getByLabelText('Mật khẩu'), '123456');
    await user.click(
      screen.getByRole('button', { name: /vào hệ thống/i }),
    );

    await waitFor(() => {
      expect(mocks.authLogin).toHaveBeenCalledWith({
        email: 'user@cmc.com',
        password: '123456',
      });
    });

    expect(mocks.contextLogin).toHaveBeenCalledWith(
      'token-123',
      authResponse.user,
    );
    expect(await screen.findByText('TRANG_VE_CUA_TOI')).toBeInTheDocument();
  });

  it('hiển thị lỗi đăng nhập từ backend', async () => {
    const user = userEvent.setup();
    mocks.authLogin.mockRejectedValue({
      message: 'Email hoặc mật khẩu không đúng',
    });

    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'wrong@cmc.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'saimatkhau');
    await user.click(
      screen.getByRole('button', { name: /vào hệ thống/i }),
    );

    expect(
      await screen.findByText('Email hoặc mật khẩu không đúng'),
    ).toBeInTheDocument();
    expect(mocks.contextLogin).not.toHaveBeenCalled();
  });

  it('không đăng ký khi mật khẩu xác nhận không khớp', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await user.type(screen.getByLabelText('Email'), 'new@cmc.com');
    await user.type(screen.getByLabelText('Mật khẩu'), '123456');
    await user.type(
      screen.getByLabelText('Xác nhận mật khẩu'),
      '654321',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(
      screen.getByRole('button', { name: /tạo tài khoản/i }),
    );

    expect(
      await screen.findByText('Mật khẩu xác nhận không khớp!'),
    ).toBeInTheDocument();
    expect(mocks.registerPost).not.toHaveBeenCalled();
  });

  it('đăng ký thành công với dữ liệu đã loại bỏ khoảng trắng', async () => {
    const user = userEvent.setup();
    mocks.registerPost.mockResolvedValue({
      id: 8,
    });

    renderRegister();

    await user.type(
      screen.getByLabelText('Họ và tên'),
      '  Nguyễn Văn B  ',
    );
    await user.type(
      screen.getByLabelText('Email'),
      '  member@cmc.com  ',
    );
    await user.type(
      screen.getByLabelText('Số điện thoại'),
      '  0912345678  ',
    );
    await user.type(screen.getByLabelText('Mật khẩu'), '123456');
    await user.type(
      screen.getByLabelText('Xác nhận mật khẩu'),
      '123456',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(
      screen.getByRole('button', { name: /tạo tài khoản/i }),
    );

    await waitFor(() => {
      expect(mocks.registerPost).toHaveBeenCalledWith('/auth/register', {
        fullName: 'Nguyễn Văn B',
        email: 'member@cmc.com',
        phone: '0912345678',
        password: '123456',
      });
    });

    expect(
      await screen.findByText(
        'Đăng ký thành công! Chuyển đến trang đăng nhập...',
      ),
    ).toBeInTheDocument();
  });
});
