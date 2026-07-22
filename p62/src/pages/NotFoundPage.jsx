import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="centered-page">
      <h1>404 · Không tìm thấy trang</h1>
      <p>Đường dẫn bạn truy cập không tồn tại.</p>
      <Link className="btn btn--primary" to="/admin/showtimes">Về trang quản trị</Link>
    </main>
  );
}
