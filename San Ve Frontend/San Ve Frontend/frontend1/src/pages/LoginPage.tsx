import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';

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
    <section className="stitch-auth-page">
      <div className="stitch-auth-grid">
        <div className="stitch-auth-visual">
          <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_50%_36%,rgba(83,216,244,.34),transparent_18rem),radial-gradient(circle_at_20%_70%,rgba(220,184,255,.28),transparent_18rem)]" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="material-symbols-outlined text-[180px] text-white/10">theaters</span>
          </div>
          <div className="stitch-auth-copy">
            <p className="stitch-kicker mb-3">Premium cinematic experience</p>
            <h1 className="text-5xl font-extrabold tracking-[-.055em] text-white">CMC Cinema</h1>
            <p className="text-white/65 mt-4 max-w-md leading-7">Đăng nhập để giữ ghế, thanh toán và quản lý vé trong không gian CineGlass.</p>
          </div>
        </div>

        <div className="stitch-card stitch-auth-card self-center">
          <p className="stitch-kicker mb-3">Welcome back</p>
          <h2 className="text-4xl font-extrabold tracking-[-.04em]">Đăng nhập</h2>
          <p className="stitch-muted mt-3 mb-8">Chào mừng trở lại trạm điều khiển.</p>

          {error && <div className="rounded-xl border px-4 py-3 mb-5 text-sm" style={{ color: 'var(--st-danger)', borderColor: 'color-mix(in srgb,var(--st-danger) 42%,transparent)' }}>{error}</div>}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <label className="stitch-label" htmlFor="email">Email</label>
              <div className="stitch-input-icon-wrap">
                <span className="material-symbols-outlined stitch-input-icon" aria-hidden="true">mail</span>
                <input id="email" name="email" type="email" className="stitch-input stitch-input-with-icon" value={form.email} onChange={handleChange} required placeholder="pilot@cmc.com" />
              </div>
            </div>
            <div>
              <label className="stitch-label" htmlFor="password">Mật khẩu</label>
              <div className="stitch-input-icon-wrap">
                <span className="material-symbols-outlined stitch-input-icon" aria-hidden="true">lock</span>
                <input id="password" name="password" type="password" className="stitch-input stitch-input-with-icon" value={form.password} onChange={handleChange} required placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="stitch-btn stitch-btn-primary w-full mt-2"><span className="material-symbols-outlined">login</span>{loading ? 'Đang đăng nhập...' : 'Vào hệ thống'}</button>
          </form>
          <p className="stitch-muted text-center mt-7">Chưa có tài khoản? <Link to="/register" className="font-semibold" style={{ color: 'var(--st-cyan)' }}>Đăng ký ngay</Link></p>
        </div>
      </div>
    </section>
  );
}
