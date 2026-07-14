import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className={`text-center rounded-2xl p-10 max-w-md w-full ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow'}`}>
        <p className="text-6xl mb-4">🚫</p>
        <h1 className="text-3xl font-extrabold mb-2">403 — Không có quyền</h1>
        <p className={`mb-6 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Bạn không có quyền truy cập trang này. Trang này chỉ dành cho quản trị viên.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className={`px-5 py-2 rounded-xl border font-semibold text-sm ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Quay lại
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}