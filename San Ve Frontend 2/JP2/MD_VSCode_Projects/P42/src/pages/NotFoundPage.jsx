import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section>
      <h1>404 - Không tìm thấy trang</h1>
      <p>Trang bạn đang tìm kiếm không tồn tại.</p>
      <Link to="/">Quay về trang chủ</Link>
    </section>
  );
}

export default NotFoundPage;
