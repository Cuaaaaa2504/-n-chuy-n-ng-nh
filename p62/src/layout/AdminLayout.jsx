import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <a href="#main" className="skip-link">Bỏ qua điều hướng</a>

      <header className="admin-shell__header">
        <span className="brand">CineHunt Admin</span>
        <nav className="nav" aria-label="Điều hướng chính">
          {/* NavLink thay cho Link -> menu có trạng thái active */}
          <NavLink to="/admin/showtimes" className={linkClass}>Suất chiếu</NavLink>
          <NavLink to="/admin/bookings" className={linkClass}>Đơn đặt vé</NavLink>
        </nav>
        <div className="admin-shell__user">
          <span>{user?.fullName || user?.email}</span>
          <button type="button" className="btn btn--sm" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      <main id="main" className="admin-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
