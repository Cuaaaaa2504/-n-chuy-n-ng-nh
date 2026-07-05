import { NavLink } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/movies', label: 'Quản lý phim', icon: '🎬' },
  { to: '/admin/showtimes', label: 'Quản lý suất chiếu', icon: '🕐' },
  { to: '/admin/bookings', label: 'Quản lý đặt vé', icon: '🎟️' },
];

export default function AdminSidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="font-extrabold text-red-500 text-lg">🎬 Movie Admin</p>
        <p className="text-xs text-gray-500 mt-0.5">Quản trị hệ thống</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-red-500 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
