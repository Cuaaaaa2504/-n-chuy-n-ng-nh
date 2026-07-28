const FOOTER_LINK =
  'font-body-md text-on-surface-variant hover:text-secondary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)] transition-all cursor-pointer';

const COL_TITLE =
  'font-label-sm text-label-sm uppercase tracking-wider text-on-surface mb-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]';

export default function Footer() {
  return (
    <footer className="bg-ultra-dark-navy border-t border-white/10 w-full">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 grid grid-cols-1 md:grid-cols-4 gap-gutter-desktop">
        <div className="flex flex-col gap-4">
          <div className="font-headline-lg text-[24px] font-bold text-primary-container text-glow">
            CMC Cinema
          </div>
          <p className="font-body-md text-on-surface-variant">
            Trải nghiệm điện ảnh đỉnh cao với không gian sang trọng và công nghệ màn hình tiên tiến
            nhất.
          </p>
          <div className="flex flex-col gap-1 font-body-md text-on-surface-variant">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">call</span>
              1900 636807
            </span>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">mail</span>
              support@cmccinema.vn
            </span>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">place</span>
              123 Nguyễn Trãi, Hà Nội
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className={COL_TITLE}>Hỗ trợ</h4>
          <p className={FOOTER_LINK}>Hướng dẫn đặt vé online</p>
          <p className={FOOTER_LINK}>Điều khoản sử dụng</p>
          <p className={FOOTER_LINK}>Chính sách hoàn vé</p>
          <p className={FOOTER_LINK}>F.A.Q</p>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className={COL_TITLE}>Về chúng tôi</h4>
          <p className={FOOTER_LINK}>Giới thiệu</p>
          <p className={FOOTER_LINK}>Tuyển dụng</p>
          <p className={FOOTER_LINK}>Nhượng quyền</p>
          <p className={FOOTER_LINK}>Liên hệ quảng cáo</p>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className={COL_TITLE}>Kết nối</h4>
          <div className="flex gap-3 mt-1">
            {['public', 'photo_camera', 'smart_display'].map((icon) => (
              <span
                key={icon}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-secondary hover:border-secondary/50 hover:shadow-[0_0_14px_rgba(76,215,246,0.35)] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-5 font-label-sm text-label-sm uppercase tracking-wider text-outline text-center">
          © 2026 CMC Cinema. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
