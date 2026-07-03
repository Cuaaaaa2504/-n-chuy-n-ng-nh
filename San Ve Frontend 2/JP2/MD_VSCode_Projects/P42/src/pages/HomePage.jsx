import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <section className="page hero">
      <h1>Đặt vé xem phim nhanh chóng</h1>
      <p>Chọn phim, giữ ghế, thanh toán và nhận vé QR trong một luồng thống nhất.</p>
      <div className="actions">
        <Link className="button" to="/movies">Xem danh sách phim</Link>
        <Link className="button secondary" to="/my-tickets">Vé của tôi</Link>
      </div>
    </section>
  );
}
