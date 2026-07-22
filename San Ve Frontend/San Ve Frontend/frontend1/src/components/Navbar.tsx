import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { resolveAssetUrl } from '../utils/assetUrl';

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ticketSubmenuOpen, setTicketSubmenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setTicketSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    setTicketSubmenuOpen(false);
    logout();
    navigate('/');
  };

  const avatarLetter = (user?.fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <nav
      className={`sticky top-0 z-50 shadow-md ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'
      }`}
    >
      {/* Top bar */}
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
            <div className="relative" ref={dropdownRef}>
              {/* Avatar button */}
              <button
                onClick={() => {
                  setDropdownOpen((prev) => !prev);
                  setTicketSubmenuOpen(false);
                }}
                className="flex items-center gap-2 hover:opacity-90 transition focus:outline-none"
              >
                {user?.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(user.avatarUrl)}
                    alt={user.fullName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white/60"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base border-2 ${
                    darkMode
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-white text-blue-600 border-white'
                  }`}>
                    {avatarLetter}
                  </div>
                )}
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  className={`absolute right-0 top-12 w-56 rounded-xl shadow-xl border overflow-visible z-50 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-4 py-3 border-b ${
                    darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <p className="font-bold text-sm truncate">{user?.fullName || 'Người dùng'}</p>
                    <p className={`text-xs truncate ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {/* Thông tin cá nhân */}
                    <Link
                      to="/profile"
                      onClick={() => { setDropdownOpen(false); setTicketSubmenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span>👤</span>
                      <span>Thông tin cá nhân</span>
                    </Link>

                    {/* ====== Vé của tôi — có submenu ====== */}
                    <div className="relative">
                      <button
                        onClick={() => setTicketSubmenuOpen((prev) => !prev)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition ${
                          ticketSubmenuOpen
                            ? darkMode
                              ? 'bg-gray-700 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : darkMode
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span>🎫</span>
                          <span>Vé của tôi</span>
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            ticketSubmenuOpen ? 'rotate-90' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 9 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Submenu vé — mở ra bên dưới */}
                      {ticketSubmenuOpen && (
                        <div className={`border-t ${
                          darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'
                        }`}>
                          {/* Vé đang giữ */}
                          <Link
                            to="/my-tickets?tab=holding"
                            onClick={() => { setDropdownOpen(false); setTicketSubmenuOpen(false); }}
                            className={`flex items-center gap-3 pl-10 pr-4 py-2.5 text-sm transition ${
                              darkMode
                                ? 'hover:bg-gray-700 text-yellow-400'
                                : 'hover:bg-yellow-50 text-yellow-600'
                            }`}
                          >
                            <span>⏳</span>
                            <span className="font-medium">Vé đang giữ</span>
                          </Link>

                          {/* Vé đã mua */}
                          <Link
                            to="/my-tickets?tab=paid"
                            onClick={() => { setDropdownOpen(false); setTicketSubmenuOpen(false); }}
                            className={`flex items-center gap-3 pl-10 pr-4 py-2.5 text-sm transition ${
                              darkMode
                                ? 'hover:bg-gray-700 text-green-400'
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                          >
                            <span>✅</span>
                            <span className="font-medium">Vé đã mua</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Các mục còn lại */}
                    {[
                      { to: '/booking-history', icon: '📜', label: 'Lịch sử mua vé' },
                      { to: '/vouchers',        icon: '🎁', label: 'Voucher' },
                      { to: '/settings',        icon: '⚙️', label: 'Cài đặt' },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => { setDropdownOpen(false); setTicketSubmenuOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                          darkMode
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Divider + logout */}
                  <div className={`border-t ${
                    darkMode ? 'border-gray-700' : 'border-gray-100'
                  }`}>
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                        darkMode
                          ? 'text-red-400 hover:bg-gray-700'
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <span>🚪</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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

      {/* Main nav */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-extrabold text-blue-500 tracking-tight">
          🎬 CMC Cinema
        </Link>
        <div className="flex gap-7 text-sm font-semibold uppercase tracking-wide">
          {/* FIX Lỗi 4: trước đây trỏ về "/" (trang chủ), không có trang lịch chiếu */}
          <Link to="/schedule" className="hover:text-blue-500 transition">Lịch chiếu</Link>
          <Link to="/movies" className="hover:text-blue-500 transition">Phim</Link>
          <Link to="/cinemas" className="hover:text-blue-500 transition">Rạp</Link>
          <Link to="/price" className="hover:text-blue-500 transition">Giá vé</Link>
          <Link to="/news" className="hover:text-blue-500 transition">Tin tức &amp; Ưu đãi</Link>
          {isLoggedIn && user?.role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-red-400 transition text-red-400">
              ⚙️ Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
