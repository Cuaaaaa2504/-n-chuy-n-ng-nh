import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundPage() {
  const { darkMode } = useTheme();
  return (
    <div
      className={`min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 text-center ${
        darkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <p className="text-8xl font-extrabold text-blue-500 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Không tìm thấy trang</h1>
      <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
      </p>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition"
      >
        Quay về trang chủ
      </Link>
    </div>
  );
}
