import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/useTheme';
import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="stitch-admin-shell relative min-h-screen flex overflow-hidden">
      <div aria-hidden className="cineglass-grid" />
      <div aria-hidden className="cineglass-noise" />
      <div aria-hidden className="cineglass-orb cineglass-orb--violet" />
      <div aria-hidden className="cineglass-orb cineglass-orb--cyan" />

      <div className="relative z-10 flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <header className="stitch-admin-header">
            <div>
              <p className="stitch-kicker mb-1">CMC Cinema Control Center</p>
              <h1>Trang quản trị</h1>
              <p>Quản lý dữ liệu hệ thống đặt vé xem phim</p>
            </div>

            <div className="stitch-admin-actions">
              <div className="hidden sm:block text-right">
                <p className="font-semibold">{user?.fullName ?? user?.email ?? 'Admin'}</p>
                <p className="stitch-admin-session">Phiên quản trị đang hoạt động</p>
              </div>
              <span className="stitch-admin-role">{user?.role}</span>
              <button type="button" onClick={toggleDarkMode} className="stitch-admin-icon-button" aria-label={darkMode ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>
                <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <button type="button" onClick={() => navigate('/')} className="stitch-admin-home-button">
                <span className="material-symbols-outlined">home</span>
                <span className="hidden sm:inline">Về trang chủ</span>
              </button>
            </div>
          </header>

          <main className="stitch-admin-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
