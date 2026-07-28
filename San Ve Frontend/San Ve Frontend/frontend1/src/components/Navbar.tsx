import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { resolveAssetUrl } from '../utils/assetUrl';
import NotificationBell from './NotificationBell';

const NAV_LINK =
  'font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-secondary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)] transition-all duration-300 px-3 py-2 rounded-full hover:bg-white/5';

const ICON_BTN =
  'text-on-surface-variant hover:text-secondary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)] transition-colors p-2 rounded-full hover:bg-white/5 flex items-center justify-center';

const MENU_ITEM =
  'flex items-center gap-3 px-4 py-2.5 font-body-md text-[14px] text-on-surface-variant hover:text-secondary hover:bg-white/5 transition-colors';

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

  const closeAll = () => {
    setDropdownOpen(false);
    setTicketSubmenuOpen(false);
  };

  const avatarLetter = (user?.fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-glass-surface backdrop-blur-xl border-b border-white/10 shadow-lg shadow-primary/5">
      <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          to="/"
          className="font-headline-lg text-[24px] font-bold text-primary-container text-glow shrink-0"
        >
          CMC Cinema
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Link to="/schedule" className={NAV_LINK}>
            Lịch chiếu
          </Link>
          <Link to="/movies" className={NAV_LINK}>
            Phim
          </Link>
          {isLoggedIn && (user?.role === 'STAFF' || user?.role === 'ADMIN') && (
            <Link
              to="/staff/checkin"
              className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary hover:drop-shadow-[0_0_8px_rgba(231,231,133,0.8)] transition-all duration-300 px-3 py-2 rounded-full hover:bg-white/5 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Soát vé
            </Link>
          )}
          {isLoggedIn && user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className="font-label-sm text-label-sm uppercase tracking-wider text-error hover:drop-shadow-[0_0_8px_rgba(255,180,171,0.8)] transition-all duration-300 px-3 py-2 rounded-full hover:bg-white/5 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">shield_person</span>
              Admin
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className={`${ICON_BTN} hidden sm:flex gap-1.5`}>
            <span className="material-symbols-outlined text-[20px]">location_on</span>
            <select className="bg-transparent font-label-sm text-label-sm uppercase tracking-wider text-inherit cursor-pointer outline-none [&>option]:bg-surface-container [&>option]:text-on-surface">
              <option>CMC Cinema Hà Nội</option>
              <option>CMC Cinema HCM</option>
              <option>CMC Cinema Đà Nẵng</option>
            </select>
          </div>

          <button onClick={toggleDarkMode} className={ICON_BTN} aria-label="Đổi giao diện">
            <span className="material-symbols-outlined text-[20px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* FIX [mục 3.1 + 3.2]: chuông thông báo + badge chưa đọc. */}
          {isLoggedIn && <NotificationBell darkMode={darkMode} />}

          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setDropdownOpen((prev) => !prev);
                  setTicketSubmenuOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
              >
                {user?.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(user.avatarUrl)}
                    alt={user.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-primary/50 shadow-[0_0_12px_rgba(221,183,255,0.35)]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-title-md text-[15px] font-bold bg-primary-container text-on-primary shadow-[0_0_12px_rgba(221,183,255,0.45)]">
                    {avatarLetter}
                  </div>
                )}
                <span
                  className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-14 w-64 rounded-xl glass-panel overflow-hidden z-50 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
                  <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                    <p className="font-title-md text-[15px] text-on-surface truncate">
                      {user?.fullName || 'Người dùng'}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link to="/profile" onClick={closeAll} className={MENU_ITEM}>
                      <span className="material-symbols-outlined text-[20px]">person</span>
                      <span>Thông tin cá nhân</span>
                    </Link>

                    {/* ====== Vé của tôi — có submenu ====== */}
                    <div className="relative">
                      <button
                        onClick={() => setTicketSubmenuOpen((prev) => !prev)}
                        className={`w-full justify-between ${MENU_ITEM} ${
                          ticketSubmenuOpen ? 'text-secondary bg-white/5' : ''
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">
                            confirmation_number
                          </span>
                          <span>Vé của tôi</span>
                        </span>
                        <span
                          className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                            ticketSubmenuOpen ? 'rotate-90' : ''
                          }`}
                        >
                          chevron_right
                        </span>
                      </button>

                      {ticketSubmenuOpen && (
                        <div className="border-y border-white/10 bg-black/30">
                          <Link
                            to="/my-tickets?tab=holding"
                            onClick={closeAll}
                            className={`${MENU_ITEM} pl-11 text-tertiary hover:text-tertiary`}
                          >
                            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                            <span>Vé đang giữ</span>
                          </Link>
                          <Link
                            to="/my-tickets?tab=paid"
                            onClick={closeAll}
                            className={`${MENU_ITEM} pl-11 text-secondary hover:text-secondary`}
                          >
                            <span className="material-symbols-outlined text-[18px]">task_alt</span>
                            <span>Vé đã mua</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* FIX [báo cáo bỏ sót]: 3 link cũ trỏ tới route không tồn tại
                        (/booking-history, /vouchers, /settings) nên luôn rơi 404.
                        Đã trỏ về các trang có thật. */}
                    {[
                      { to: '/my-bookings', icon: 'receipt_long', label: 'Lịch sử mua vé' },
                      { to: '/profile', icon: 'settings', label: 'Cài đặt tài khoản' },
                    ].map((item) => (
                      <Link key={item.label} to={item.to} onClick={closeAll} className={MENU_ITEM}>
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className={`w-full ${MENU_ITEM} text-error hover:text-error`}
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
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
                className="font-label-sm text-label-sm uppercase tracking-wider text-primary px-4 py-2 rounded-full border border-primary/40 hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(221,183,255,0.4)] transition-all duration-300"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-primary font-label-sm text-label-sm uppercase tracking-wider px-4 py-2 rounded-full hidden sm:inline-block"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
