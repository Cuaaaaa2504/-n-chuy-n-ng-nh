import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

interface DashboardStats {
  totalMovies: number;
  totalShowtimes: number;
  totalBookings: number;
  totalPaidBookings: number;
  totalRevenue: number;
  totalUsers: number;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition`}>
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

const QUICK_LINKS = [
  { to: '/admin/movies', label: '🎬 Quản lý Phim', desc: 'Thêm, sửa, xoá phim' },
  { to: '/admin/showtimes', label: '🕐 Quản lý Suất chiếu', desc: 'Tạo và quản lý lịch chiếu' },
  { to: '/admin/bookings', label: '🎟️ Quản lý Đặt vé', desc: 'Xem và xử lý đơn đặt vé' },
  { to: '/admin/users', label: '👥 Quản lý Người dùng', desc: 'Quản lý tài khoản người dùng' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get<DashboardStats>('/admin/stats');
      setStats(res.data);
    } catch {
      // fallback mock nếu API chưa có
      setStats({
        totalMovies: 0,
        totalShowtimes: 0,
        totalBookings: 0,
        totalPaidBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold">Dashboard</h2>
        <button
          onClick={fetchStats}
          className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 text-sm transition"
        >
          🔄 Làm mới
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
              <div className="h-6 w-6 bg-gray-700 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-700 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon="🎬" label="Tổng phim" value={fmt(stats?.totalMovies ?? 0)} color="text-white" />
          <StatCard icon="🕐" label="Suất chiếu" value={fmt(stats?.totalShowtimes ?? 0)} color="text-blue-400" />
          <StatCard icon="🎟️" label="Đơn đặt vé" value={fmt(stats?.totalBookings ?? 0)} color="text-yellow-400" />
          <StatCard
            icon="✅"
            label="Đã thanh toán"
            value={fmt(stats?.totalPaidBookings ?? 0)}
            sub={`/ ${fmt(stats?.totalBookings ?? 0)} tổng đơn`}
            color="text-green-400"
          />
          <StatCard
            icon="💰"
            label="Doanh thu"
            value={fmtCurrency(stats?.totalRevenue ?? 0)}
            color="text-emerald-400"
          />
          <StatCard icon="👥" label="Người dùng" value={fmt(stats?.totalUsers ?? 0)} color="text-purple-400" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 hover:bg-gray-800/60 transition group"
          >
            <p className="font-bold text-white group-hover:text-blue-400 transition">{link.label}</p>
            <p className="text-gray-500 text-sm mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
