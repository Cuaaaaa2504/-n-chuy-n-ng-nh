import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const INPUT =
  'w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-on-surface placeholder-outline-variant input-glow font-body-md text-body-md transition-all duration-200';

const LABEL = 'block font-label-sm text-label-sm uppercase text-on-surface-variant mb-2';

const FIELDS: {
  name: keyof RegisterForm;
  label: string;
  placeholder: string;
  type: string;
  icon: string;
}[] = [
  { name: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn A', type: 'text', icon: 'person' },
  { name: 'email', label: 'Email', placeholder: 'pilot@cmc.com', type: 'email', icon: 'mail' },
  { name: 'phone', label: 'Số điện thoại', placeholder: '09xx xxx xxx', type: 'text', icon: 'call' },
  { name: 'password', label: 'Mật khẩu', placeholder: '••••••••', type: 'password', icon: 'lock' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
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
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center overflow-hidden px-margin-mobile py-16">
      <div
        aria-hidden
        className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary rounded-full mix-blend-screen blur-[100px] opacity-20"
      />
      <div
        aria-hidden
        className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary rounded-full mix-blend-screen blur-[100px] opacity-20"
      />

      <div className="glass-panel p-8 md:p-12 rounded-xl w-full max-w-md relative z-10 shadow-[0_0_20px_rgba(3,181,212,0.15)]">
        <h1 className="font-display-lg text-headline-lg text-primary drop-shadow-[0_0_10px_rgba(240,218,255,0.8)] text-center mb-2">
          CMC Cinema
        </h1>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-2">Đăng ký</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          Tạo tài khoản để bắt đầu hành trình.
        </p>

        {message && (
          <p
            className={`flex items-center gap-2 font-body-md text-[14px] rounded-lg px-4 py-3 mb-6 border ${
              isError
                ? 'text-error bg-error/10 border-error/30'
                : 'text-secondary bg-secondary/10 border-secondary/30'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isError ? 'error' : 'task_alt'}
            </span>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {FIELDS.map((field) => (
            <div key={field.name}>
              <label className={LABEL} htmlFor={field.name}>
                {field.label}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  {field.icon}
                </span>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleChange}
                  required={field.name !== 'phone'}
                  className={INPUT}
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-glow w-full py-3 rounded-lg font-title-md text-title-md uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="font-body-md text-[14px] text-on-surface-variant text-center mt-8">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            className="text-secondary hover:text-primary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)] transition-colors font-semibold"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
