import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <main className="centered-page">
      <h1>403 · Không có quyền truy cập</h1>
      <p>Tài khoản của bạn không thuộc nhóm quản trị viên.</p>
      <Link className="btn" to="/login">Đăng nhập tài khoản khác</Link>
    </main>
  );
}
