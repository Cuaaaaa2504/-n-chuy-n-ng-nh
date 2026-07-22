import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../../api/adminApi';

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
  { to: '/admin/vouchers', label: '🎫 Voucher', desc: 'Tạo, sửa, bật/tắt mã giảm giá' },
  { to: '/admin/cinemas', label: '🏛️ Rạp & Phòng chiếu', desc: 'Quản lý rạp và phòng chiếu' },
  { to: '/admin/products', label: '🍿 Sản phẩm & Combo', desc: 'Quản lý bắp nước và combo' },
  { to: '/admin/refunds', label: '💸 Hoàn tiền', desc: 'Duyệt / từ chối yêu cầu hoàn tiền' },
  { to: '/admin/reports', label: '📊 Báo cáo doanh thu', desc: 'Doanh thu theo ngày / phim / rạp' },
  { to: '/admin/audit-logs', label: '📋 Nhật ký hệ thống', desc: 'Lịch sử thao tác trong hệ thống' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await statsApi.getStats();
      setStats(res as DashboardStats);
    } catch (err) {
      // FIX BUG-05: KHÔNG fallback sang số liệu mẫu nữa.
      // Số giả trông "hợp lý" trên dashboard rất dễ bị hiểu nhầm là dữ liệu thật
      // khi demo với khách hàng. Thà không hiển thị gì còn hơn hiển thị sai.
      setError(
        (err as { message?: string })?.message ||
          'Không thể tải thống kê từ máy chủ.',
      );
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX react-hooks/set-state-in-effect: wrap fetchStats trong async IIFE
  useEffect(() => {
    void (async () => {
      await fetchStats();
    })();
  }, [fetchStats]);

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tổng quan hệ thống</h1>
          <p className="text-gray-400 text-sm mt-1">Dữ liệu thời gian thực từ hệ thống</p>
        </div>
        <button
          onClick={() => { void fetchStats(); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition disabled:opacity-40"
        >
          {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>⚠️ {error}</span>
          <button
            onClick={() => { void fetchStats(); }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-red-500/40 hover:bg-red-500/10 text-xs font-semibold transition"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon="🎬" label="Tổng phim"        value={fmt(stats.totalMovies)}       color="text-amber-400" />
          <StatCard icon="🕐" label="Suất chiếu"       value={fmt(stats.totalShowtimes)}    color="text-blue-400" />
          <StatCard icon="🎟️" label="Tổng đặt vé"     value={fmt(stats.totalBookings)}     color="text-green-400" />
          <StatCard icon="✅" label="Đã thanh toán"    value={fmt(stats.totalPaidBookings)} color="text-emerald-400"
            sub={`/ ${fmt(stats.totalBookings)} đặt vé`} />
          <StatCard icon="💰" label="Doanh thu"        value={`${fmt(stats.totalRevenue)} ₫`} color="text-yellow-400" />
          <StatCard icon="👥" label="Người dùng"       value={fmt(stats.totalUsers)}        color="text-purple-400" />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 border border-dashed border-gray-800 rounded-2xl">
          <p className="text-4xl mb-3">📊</p>
          <p>Chưa có số liệu thống kê để hiển thị.</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 transition group"
            >
              <p className="text-base font-semibold group-hover:text-amber-400 transition">{label}</p>
              <p className="text-gray-500 text-sm mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
