import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="stitch-page grid place-items-center">
      <div className="stitch-container--narrow grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="stitch-kicker mb-3">Lost in the cinema</p>
          <h1 className="text-[clamp(5rem,17vw,11rem)] leading-none font-extrabold tracking-[-.09em]" style={{ color: 'var(--st-purple)', textShadow: '0 0 34px rgba(220,184,255,.35)' }}>404</h1>
          <h2 className="text-3xl font-extrabold mt-2">Không tìm thấy trang</h2>
          <p className="stitch-muted mt-4 leading-7">Đường dẫn này không tồn tại hoặc đã được chuyển sang khu vực khác của hệ thống.</p>
          <Link to="/" className="stitch-btn stitch-btn-primary mt-7"><span className="material-symbols-outlined">home</span>Quay lại trang chủ</Link>
        </div>
        <div className="stitch-card aspect-video grid place-items-center bg-[radial-gradient(circle_at_50%_50%,rgba(83,216,244,.19),transparent_40%),linear-gradient(145deg,#1e1729,#08070b)]">
          <span className="material-symbols-outlined text-[110px] text-white/15">movie_off</span>
        </div>
      </div>
    </section>
  );
}
