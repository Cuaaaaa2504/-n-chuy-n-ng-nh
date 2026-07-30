import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const FIELDS: {
  name: keyof RegisterForm;
  label: string;
  placeholder: string;
  type: string;
  icon: string;
  autoComplete?: string;
  minLength?: number;
}[] = [
  { name: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn A', type: 'text', icon: 'person', autoComplete: 'name' },
  { name: 'email', label: 'Email', placeholder: 'pilot@cmc.com', type: 'email', icon: 'mail', autoComplete: 'email' },
  { name: 'phone', label: 'Số điện thoại', placeholder: '09xx xxx xxx', type: 'tel', icon: 'call', autoComplete: 'tel' },
  { name: 'password', label: 'Mật khẩu', placeholder: '••••••••', type: 'password', icon: 'lock', autoComplete: 'new-password', minLength: 6 },
  { name: 'confirmPassword', label: 'Xác nhận mật khẩu', placeholder: '••••••••', type: 'password', icon: 'lock_reset', autoComplete: 'new-password', minLength: 6 },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterForm>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setIsError(true);
      setMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!acceptedTerms) {
      setIsError(true);
      setMessage('Bạn cần đồng ý với Điều khoản dịch vụ để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      // Chỉ gửi các trường backend cần, không gửi confirmPassword lên server.
      const { fullName, email, phone, password } = formData;
      await axiosClient.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
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
    <section className="stitch-auth-page">
      <div className="stitch-auth-grid">
        <div className="stitch-auth-visual order-2 lg:order-1">
          <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_70%_25%,rgba(220,184,255,.34),transparent_19rem),radial-gradient(circle_at_25%_76%,rgba(83,216,244,.24),transparent_18rem)]" />
          <div className="absolute inset-0 grid place-items-center"><span className="material-symbols-outlined text-[180px] text-white/10">movie_filter</span></div>
          <div className="stitch-auth-copy">
            <p className="stitch-kicker mb-3">Join the cinema network</p>
            <h1 className="text-5xl font-extrabold tracking-[-.055em] text-white">Tạo tài khoản</h1>
            <p className="text-white/65 mt-4 max-w-md leading-7">Lưu lịch sử mua vé, nhận ưu đãi thành viên và đặt chỗ nhanh hơn.</p>
          </div>
        </div>

        <div className="stitch-card stitch-auth-card order-1 lg:order-2">
          <p className="stitch-kicker mb-3">New member</p>
          <h2 className="text-4xl font-extrabold tracking-[-.04em]">Đăng ký</h2>
          <p className="stitch-muted mt-3 mb-7">Tạo tài khoản để bắt đầu hành trình.</p>

          {message && <div className="rounded-xl border px-4 py-3 mb-5 text-sm" style={{ color: isError ? 'var(--st-danger)' : 'var(--st-success)', borderColor: isError ? 'color-mix(in srgb,var(--st-danger) 42%,transparent)' : 'color-mix(in srgb,var(--st-success) 42%,transparent)' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="grid gap-4">
            {FIELDS.map((field) => (
              <div key={field.name}>
                <label className="stitch-label" htmlFor={field.name}>{field.label}</label>
                <div className="stitch-input-icon-wrap">
                  <span className="material-symbols-outlined stitch-input-icon" aria-hidden="true">{field.icon}</span>
                  <input id={field.name} name={field.name} type={field.type} className="stitch-input stitch-input-with-icon" value={formData[field.name]} onChange={handleChange} required={field.name !== 'phone'} autoComplete={field.autoComplete} minLength={field.minLength} placeholder={field.placeholder} />
                </div>
              </div>
            ))}
            <label className="flex items-start gap-3 text-sm stitch-muted cursor-pointer mt-1">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required className="mt-1 accent-purple-400" />
              <span>Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của CMC Cinema.</span>
            </label>
            <button type="submit" disabled={loading} className="stitch-btn stitch-btn-primary w-full mt-2"><span className="material-symbols-outlined">person_add</span>{loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}</button>
          </form>
          <p className="stitch-muted text-center mt-7">Đã có tài khoản? <Link to="/login" className="font-semibold" style={{ color: 'var(--st-cyan)' }}>Đăng nhập</Link></p>
        </div>
      </div>
    </section>
  );
}
