import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <section className="stitch-page grid place-items-center overflow-hidden">
      <div className="relative stitch-card p-10 md:p-14 text-center max-w-2xl mx-auto border border-primary/30 shadow-[0_0_60px_rgba(174,112,229,.18)]">
        <span className="material-symbols-outlined text-[64px]" style={{ color: 'var(--st-danger)' }}>lock</span>
        <p className="stitch-kicker mt-5">Access restricted</p>
        <h1 className="text-6xl font-extrabold mt-3 tracking-[-.06em]">403</h1>
        <h2 className="text-2xl font-extrabold mt-3">Quyền truy cập bị mã hóa</h2>
        <p className="stitch-muted leading-7 mt-4 max-w-lg mx-auto">Tài khoản hiện tại không có quyền mở khu vực này. Hãy quay về khu vực công khai hoặc đăng nhập bằng tài khoản phù hợp.</p>
        <Link to="/" className="stitch-btn stitch-btn-primary mt-8">Về trang chủ</Link>
      </div>
    </section>
  );
}
