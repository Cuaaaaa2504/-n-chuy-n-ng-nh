import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LoginResponse {
  accessToken?: string;
  token?: string;
  data?: { accessToken?: string };
  user?: { id: number; fullName: string; email: string; phone?: string; role?: string };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const { darkMode } = useTheme();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(
    params.get('expired') ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await axiosClient.post<LoginResponse>('/auth/login', form) as LoginResponse;
      const token = data.accessToken || data.token || data.data?.accessToken;
      if (!token) throw new Error('API không trả về accessToken');
      const user = data.user ?? { id: 0, fullName: '', email: form.email };
      login(token, user);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 ${
        darkMode ? 'bg-gray-950' : 'bg-gray-100'
      }`}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-lg p-8 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <h1 className="text-2xl font-extrabold mb-6 text-center">🔐 Đăng nhập</h1>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          />
          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            required
            className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className={`text-sm text-center mt-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-500 hover:underline font-semibold">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
