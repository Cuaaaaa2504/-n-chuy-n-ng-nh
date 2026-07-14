import { useTheme } from '../context/useTheme';

export default function Footer() {
  const { darkMode } = useTheme();
  return (
    <footer
      className={`border-t py-10 ${
        darkMode
          ? 'bg-gray-900 border-gray-700 text-gray-400'
          : 'bg-white border-gray-200 text-gray-500'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="font-extrabold text-blue-500 text-xl mb-2">🎬 CMC Cinema</p>
          <p>Hotline: <strong>1900 636807</strong></p>
          <p>Email: support@cmccinema.vn</p>
          <p className="mt-2">Địa chỉ: 123 Nguyễn Trãi, Hà Nội</p>
        </div>
        <div>
          <p className="font-bold mb-3 uppercase tracking-wide">Hỗ trợ</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Hướng dẫn đặt vé online</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Điều khoản sử dụng</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Chính sách hoàn vé</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">F.A.Q</p>
        </div>
        <div>
          <p className="font-bold mb-3 uppercase tracking-wide">Về chúng tôi</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Giới thiệu</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Tuyển dụng</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Nhượng quyền</p>
          <p className="hover:text-blue-500 cursor-pointer mb-1">Liên hệ quảng cáo</p>
        </div>
      </div>
      <div
        className={`max-w-6xl mx-auto px-4 mt-8 pt-6 border-t text-xs text-center ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        © 2026 CMC Cinema. All rights reserved.
      </div>
    </footer>
  );
}
