import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex-1 flex items-center justify-center px-margin-mobile py-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[55%] h-[40%] bg-error rounded-full mix-blend-screen blur-[120px] opacity-[0.12]"
      />

      <div className="glass-panel relative z-10 text-center rounded-xl p-10 max-w-md w-full">
        <span className="material-symbols-outlined text-[56px] text-error drop-shadow-[0_0_16px_rgba(255,180,171,0.6)]">
          gpp_maybe
        </span>
        <p className="font-display-lg text-[64px] leading-none font-extrabold text-error mt-2 mb-2">
          403
        </p>
        <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-3">
          Không có quyền truy cập
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          Bạn không có quyền truy cập trang này. Trang này chỉ dành cho quản trị viên.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary px-5 py-2.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Quay lại
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-5 py-2.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
