import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <main className="center-page">
      <section className="center-card">
        <h1>403 Forbidden</h1>
        <p>Bạn không có quyền truy cập khu vực quản trị.</p>
        <Link to="/" className="primary-link">
          Quay về trang chủ
        </Link>
      </section>
    </main>
  );
}
