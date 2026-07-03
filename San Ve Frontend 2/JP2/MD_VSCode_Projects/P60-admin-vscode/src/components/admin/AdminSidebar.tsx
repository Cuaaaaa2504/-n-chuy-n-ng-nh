import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "admin-sidebar__link active" : "admin-sidebar__link";

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__logo">
        <h2>Movie Admin</h2>
        <span>Quản trị hệ thống</span>
      </div>

      <nav className="admin-sidebar__nav">
        <NavLink to="/admin" end className={getLinkClass}>
          Dashboard
        </NavLink>

        <NavLink to="/admin/movies" className={getLinkClass}>
          Quản lý phim
        </NavLink>

        <NavLink to="/admin/showtimes" className={getLinkClass}>
          Quản lý suất chiếu
        </NavLink>

        <NavLink to="/admin/bookings" className={getLinkClass}>
          Quản lý đặt vé
        </NavLink>
      </nav>
    </aside>
  );
}
