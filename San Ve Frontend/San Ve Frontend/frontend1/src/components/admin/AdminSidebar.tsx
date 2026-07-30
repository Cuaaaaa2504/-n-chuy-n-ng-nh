import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/admin', label: 'Tổng quan', icon: 'dashboard', end: true },
  { to: '/admin/movies', label: 'Phim', icon: 'movie' },
  { to: '/admin/showtimes', label: 'Suất chiếu', icon: 'schedule' },
  { to: '/admin/bookings', label: 'Đặt vé', icon: 'confirmation_number' },
  { to: '/admin/users', label: 'Người dùng', icon: 'group' },
  { to: '/admin/vouchers', label: 'Voucher', icon: 'local_activity' },
  { to: '/admin/cinemas', label: 'Rạp & Phòng chiếu', icon: 'theaters' },
  { to: '/admin/products', label: 'Sản phẩm & Combo', icon: 'fastfood' },
  { to: '/admin/refunds', label: 'Hoàn tiền', icon: 'currency_exchange' },
  { to: '/admin/reports', label: 'Báo cáo doanh thu', icon: 'analytics' },
  { to: '/admin/notifications', label: 'Gửi thông báo', icon: 'notifications_active' },
  { to: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: 'history' },
];

export default function AdminSidebar() {
  return (
    <aside className="stitch-admin-sidebar">
      <div className="stitch-admin-brand">
        <span className="material-symbols-outlined">admin_panel_settings</span>
        <div><strong>CMC Admin</strong><small>Control Center</small></div>
      </div>
      <nav>
        {LINKS.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `stitch-admin-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="stitch-admin-sidebar-note">
        <span className="material-symbols-outlined">shield</span>
        <p>Chế độ quản trị<br /><small>Thao tác được ghi nhật ký</small></p>
      </div>
    </aside>
  );
}
