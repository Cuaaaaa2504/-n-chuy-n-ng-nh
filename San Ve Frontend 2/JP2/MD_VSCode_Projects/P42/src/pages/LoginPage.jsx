import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(params.get('expired') ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : '');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await axiosClient.post('/auth/login', form);
      const token = data.accessToken || data.token || data.data?.accessToken;
      if (!token) throw new Error('API không trả về accessToken');
      localStorage.setItem('accessToken', token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-changed'));
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally { setLoading(false); }
  };

  return (
    <section className="page form-page">
      <h1>Đăng nhập</h1>
      {error && <p className="error">{error}</p>}
      <form className="form" onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Mật khẩu" value={form.password} onChange={handleChange} required />
        <button disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
    </section>
  );
}
