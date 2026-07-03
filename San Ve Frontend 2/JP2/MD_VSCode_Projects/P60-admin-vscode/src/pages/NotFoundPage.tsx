import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="center-page">
      <section className="center-card">
        <h1>404 - Không tìm thấy trang</h1>
        <p>Đường dẫn bạn truy cập không tồn tại trong hệ thống.</p>
        <div className="center-actions">
          <Link to="/" className="primary-link">
            Về trang chủ
          </Link>
          <Link to="/admin" className="secondary-link">
            Vào Admin
          </Link>
        </div>
      </section>
    </main>
  );
}
