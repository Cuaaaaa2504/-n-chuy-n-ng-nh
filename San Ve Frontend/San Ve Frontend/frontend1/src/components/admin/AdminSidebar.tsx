import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/admin', label: '📊 Dashboard', end: true },
  { to: '/admin/movies', label: '🎬 Phim' },
  { to: '/admin/showtimes', label: '🕐 Suất chiếu' },
  { to: '/admin/bookings', label: '🎫 Đặt vé' },
  { to: '/admin/users', label: '👥 Người dùng' },
];

export default function AdminSidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 shrink-0">
      <p className="text-blue-400 font-extrabold text-lg px-3 mb-8">⚙️ Admin Panel</p>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
