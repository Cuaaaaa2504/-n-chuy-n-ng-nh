import { useState } from "react";
import axiosClient from "../api/axiosClient";

function RegisterPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await axiosClient.post("/auth/register", formData);
      setMessage("Đăng ký thành công! Bạn có thể đăng nhập.");
    } catch (error) {
      setMessage(error.message || "Đăng ký thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <h1>Đăng ký</h1>
      {message && <p className="notice">{message}</p>}
      <form onSubmit={handleSubmit} className="form">
        <input type="text" name="fullName" placeholder="Họ và tên" value={formData.fullName} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="text" name="phone" placeholder="Số điện thoại" value={formData.phone} onChange={handleChange} />
        <input type="password" name="password" placeholder="Mật khẩu" value={formData.password} onChange={handleChange} required />
        <button type="submit" disabled={loading}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</button>
      </form>
    </section>
  );
}

export default RegisterPage;
