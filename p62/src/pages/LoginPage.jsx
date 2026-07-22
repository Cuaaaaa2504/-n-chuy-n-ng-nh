import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to={location.state?.from?.pathname || '/admin/showtimes'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(form);
    } catch (err) {
      setError(err?.message || 'Đăng nhập thất bại.');
      setBusy(false);
    }
  };

  return (
    <main className="centered-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Đăng nhập quản trị</h1>

        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" required
                 value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="form-row">
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" autoComplete="current-password" required
                 value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}
