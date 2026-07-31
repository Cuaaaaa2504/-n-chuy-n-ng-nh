import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { resolveAssetUrl } from '../utils/assetUrl';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { isLoggedIn, user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    navigate('/');
  };

  const avatarLetter = (user?.fullName || user?.email || 'U').charAt(0).toUpperCase();

  const coreLinks = [
    { to: '/movies', label: 'Phim' },
    { to: '/schedule', label: 'Lịch chiếu' },
  ];

  return (
    <header className="stitch-nav">
      <div className="stitch-nav-inner">
        <Link className="stitch-brand" to="/">CMC Cinema</Link>

        <nav className="stitch-nav-links" aria-label="Điều hướng chính">
          {coreLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`stitch-nav-link ${isActive(item.to) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn && (user?.role === 'STAFF' || user?.role === 'ADMIN') && (
            <Link
              to="/staff/checkin"
              className={`stitch-nav-link ${isActive('/staff/checkin') ? 'active' : ''}`}
            >
              Soát vé
            </Link>
          )}
          {isLoggedIn && user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={`stitch-nav-link ${isActive('/admin') ? 'active' : ''}`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="stitch-nav-actions">
          <label className="stitch-location" title="Chọn cụm rạp">
            <span className="material-symbols-outlined text-[21px]">location_on</span>
            <select defaultValue="hn" aria-label="Chọn cụm rạp" className="stitch-location-select">
              <option value="hn">CMC Cinema Hà Nội</option>
              <option value="hcm">CMC Cinema HCM</option>
              <option value="dn">CMC Cinema Đà Nẵng</option>
            </select>
          </label>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="stitch-icon-btn"
            aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={darkMode ? 'Giao diện sáng' : 'Giao diện tối'}
          >
            <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {isLoggedIn && <NotificationBell darkMode={darkMode} />}

          {isLoggedIn ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full p-1.5 hover:bg-white/5 transition"
                aria-expanded={accountOpen}
                aria-label="Mở menu tài khoản"
              >
                {user?.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(user.avatarUrl)}
                    alt={user.fullName || 'Ảnh đại diện'}
                    className="w-10 h-10 rounded-full object-cover border border-primary/50 shadow-[0_0_18px_rgba(220,184,255,.35)]"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-full grid place-items-center font-bold text-[#24152e] bg-gradient-to-br from-[#dcb8ff] to-[#53d8f4] shadow-[0_0_18px_rgba(220,184,255,.35)]">
                    {avatarLetter}
                  </span>
                )}
                <span className={`material-symbols-outlined text-[19px] text-on-surface-variant transition-transform ${accountOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {accountOpen && (
                <div className="stitch-account-menu">
                  <div className="px-5 py-4 border-b border-white/10">
                    <p className="font-semibold truncate">{user?.fullName || 'Người dùng'}</p>
                    <p className="text-sm stitch-muted truncate">{user?.email}</p>
                  </div>
                  <div className="py-2">
                    <Link className="stitch-account-item" to="/profile">
                      <span className="material-symbols-outlined">person</span>
                      Hồ sơ cá nhân
                    </Link>
                    <Link className="stitch-account-item" to="/my-tickets?tab=paid">
                      <span className="material-symbols-outlined">confirmation_number</span>
                      Vé của tôi
                    </Link>
                    <Link className="stitch-account-item" to="/my-bookings">
                      <span className="material-symbols-outlined">receipt_long</span>
                      Đơn hàng của tôi
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link className="stitch-account-item" to="/admin">
                        <span className="material-symbols-outlined">shield_person</span>
                        Trang quản trị
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-white/10 py-2">
                    <button type="button" onClick={handleLogout} className="stitch-account-item" style={{ color: 'var(--st-danger)' }}>
                      <span className="material-symbols-outlined">logout</span>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="stitch-desktop-only flex items-center gap-2">
              <Link to="/login" className="stitch-btn stitch-btn-outline stitch-auth-link">Đăng nhập</Link>
              <Link to="/register" className="stitch-btn stitch-btn-primary stitch-auth-link">Đăng ký</Link>
            </div>
          )}

          <button
            type="button"
            className="stitch-icon-btn stitch-mobile-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="stitch-mobile-menu" aria-label="Điều hướng di động">
          {coreLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          {isLoggedIn ? (
            <>
              <Link to="/profile">Hồ sơ cá nhân</Link>
              <Link to="/my-tickets?tab=paid">Vé của tôi</Link>
              <Link to="/my-bookings">Đơn hàng của tôi</Link>
            </>
          ) : (
            <>
              <Link to="/login">Đăng nhập</Link>
              <Link to="/register">Đăng ký</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
