import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="stitch-footer">
      <div className="stitch-footer-grid">
        <div>
          <Link to="/" className="stitch-brand inline-block mb-4">CMC Cinema</Link>
          <p className="stitch-muted max-w-sm leading-7">
            Trải nghiệm điện ảnh cao cấp trong không gian CineGlass, nơi công nghệ, hình ảnh và cảm xúc gặp nhau.
          </p>
        </div>
        <div>
          <p className="stitch-kicker mb-4">Khám phá</p>
          <div className="grid gap-3 stitch-muted">
            <Link to="/movies" className="hover:text-secondary">Danh sách phim</Link>
            <Link to="/schedule" className="hover:text-secondary">Lịch chiếu</Link>
            <Link to="/my-tickets?tab=paid" className="hover:text-secondary">Vé của tôi</Link>
          </div>
        </div>
        <div>
          <p className="stitch-kicker mb-4">Hỗ trợ</p>
          <div className="grid gap-3 stitch-muted">
            <span>Điều khoản sử dụng</span>
            <span>Chính sách bảo mật</span>
            <span>Chính sách hoàn vé</span>
          </div>
        </div>
        <div>
          <p className="stitch-kicker mb-4">Liên hệ</p>
          <div className="grid gap-3 stitch-muted">
            <span>1900 636807</span>
            <span>support@cmccinema.vn</span>
            <span>Hà Nội, Việt Nam</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs tracking-[.14em] uppercase stitch-muted">
        © 2026 CMC Cinema. Cyber Neon Adaptive Interface.
      </div>
    </footer>
  );
}
