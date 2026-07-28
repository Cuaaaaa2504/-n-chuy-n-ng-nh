import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const INPUT =
  'w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-on-surface placeholder-outline-variant input-glow font-body-md text-body-md transition-all duration-200';

const LABEL = 'block font-label-sm text-label-sm uppercase text-on-surface-variant mb-2';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();

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
      const data = await authApi.login(form);
      login(data.accessToken, data.user);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center overflow-hidden px-margin-mobile py-16">
      <div
        aria-hidden
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full mix-blend-screen blur-[100px] opacity-20"
      />
      <div
        aria-hidden
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary rounded-full mix-blend-screen blur-[100px] opacity-20"
      />

      <div className="w-full max-w-container-max grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10">
        {/* Trái: branding */}
        <div className="hidden lg:flex flex-col items-start justify-center p-12">
          <h1 className="font-display-lg text-display-lg text-primary drop-shadow-[0_0_10px_rgba(240,218,255,0.8)] mb-6">
            CMC Cinema
          </h1>
          <p className="font-headline-lg text-headline-lg text-secondary mb-8">
            Trải nghiệm tương lai của điện ảnh.
          </p>
          <div className="w-full h-64 rounded-xl glass-panel flex items-center justify-center">
            <span className="material-symbols-outlined text-[96px] text-primary-container/40">
              theaters
            </span>
          </div>
        </div>

        {/* Phải: form */}
        <div className="glass-panel p-8 md:p-12 rounded-xl w-full max-w-md mx-auto relative shadow-[0_0_20px_rgba(3,181,212,0.15)]">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="font-display-lg text-headline-lg text-primary drop-shadow-[0_0_10px_rgba(240,218,255,0.8)]">
              CMC Cinema
            </h1>
          </div>

          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
            Đăng nhập
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Chào mừng trở lại trạm điều khiển.
          </p>

          {error && (
            <p className="flex items-center gap-2 font-body-md text-[14px] text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={LABEL} htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="pilot@cmc.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={INPUT}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary-glow w-full py-3 rounded-lg font-title-md text-title-md uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              {loading ? 'Đang đăng nhập...' : 'Vào hệ thống'}
            </button>
          </form>

          <p className="font-body-md text-[14px] text-on-surface-variant text-center mt-8">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="text-secondary hover:text-primary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)] transition-colors font-semibold"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
