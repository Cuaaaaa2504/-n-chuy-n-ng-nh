import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="relative min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-margin-mobile py-20 text-center overflow-hidden">
      <div
        aria-hidden
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-primary rounded-full mix-blend-screen blur-[120px] opacity-[0.15]"
      />

      <div className="relative z-10 flex flex-col items-center">
        <p className="font-display-lg text-[96px] leading-none font-extrabold text-primary-container text-glow mb-4">
          404
        </p>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
          Không tìm thấy trang
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-10">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xoá.
        </p>
        <Link
          to="/"
          className="btn-primary px-7 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}
