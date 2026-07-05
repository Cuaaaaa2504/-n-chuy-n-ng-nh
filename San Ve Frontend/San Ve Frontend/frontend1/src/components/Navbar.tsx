import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      className={`sticky top-0 z-50 shadow-md ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'
      }`}
    >
      <div
        className={`text-sm py-3 px-6 flex justify-between items-center ${
          darkMode ? 'bg-gray-800 text-gray-300' : 'bg-blue-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
          <span>📍</span>
          <select className="bg-transparent text-inherit text-sm font-semibold cursor-pointer outline-none">
            <option>CMC Cinema Hà Nội</option>
            <option>CMC Cinema HCM</option>
            <option>CMC Cinema Đà Nẵng</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition text-lg"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <span className="opacity-30">|</span>

          {isLoggedIn ? (
            <>
              <span className="font-semibold text-sm">
                👤 {user?.fullName || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                  darkMode
                    ? 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-white text-red-600 hover:bg-red-50'
                }`}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:underline hover:opacity-80 transition font-semibold text-sm"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                  darkMode
                    ? 'bg-blue-500 text-white hover:bg-blue-400'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-extrabold text-blue-500 tracking-tight">
          🎬 CMC Cinema
        </Link>
        <div className="flex gap-7 text-sm font-semibold uppercase tracking-wide">
          <Link to="/" className="hover:text-blue-500 transition">Lịch chiếu</Link>
          <Link to="/movies" className="hover:text-blue-500 transition">Phim</Link>
          <Link to="/cinemas" className="hover:text-blue-500 transition">Rạp</Link>
          <Link to="/price" className="hover:text-blue-500 transition">Giá vé</Link>
          <Link to="/news" className="hover:text-blue-500 transition">Tin tức & Ưu đãi</Link>
          {isLoggedIn && (
            <Link to="/my-tickets" className="hover:text-blue-500 transition">Vé của tôi</Link>
          )}
        </div>
      </div>
    </nav>
  );
}