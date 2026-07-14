import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useTheme } from '../context/useTheme';

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState<RegisterForm>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await axiosClient.post('/auth/register', formData);
      setIsError(false);
      setMessage('Đăng ký thành công! Chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error: unknown) {
      setIsError(true);
      setMessage((error as { message?: string }).message || 'Đăng ký thất bại!');
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
        <h1 className="text-2xl font-extrabold mb-6 text-center">📝 Đăng ký</h1>

        {message && (
          <p
            className={`text-sm mb-4 text-center rounded-lg px-4 py-2 ${
              isError
                ? 'text-red-500 bg-red-500/10'
                : 'text-green-500 bg-green-500/10'
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {(
            [
              { name: 'fullName', placeholder: 'Họ và tên', type: 'text' },
              { name: 'email', placeholder: 'Email', type: 'email' },
              { name: 'phone', placeholder: 'Số điện thoại', type: 'text' },
              { name: 'password', placeholder: 'Mật khẩu', type: 'password' },
            ] as { name: keyof RegisterForm; placeholder: string; type: string }[]
          ).map((field) => (
            <input
              key={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={handleChange}
              required={field.name !== 'phone'}
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            />
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className={`text-sm text-center mt-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-500 hover:underline font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
