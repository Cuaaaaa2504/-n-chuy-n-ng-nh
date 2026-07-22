import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // FIX WARN-01: đã bỏ useEffect tự redirect về /login khi !isLoggedIn.
  // AdminRouteGuard (cấp cao hơn) đã xử lý việc này ĐÚNG hơn: nó đợi
  // AuthContext.loading = false rồi mới quyết định. Layout redirect song song
  // có thể chạy trong lúc token đang được verify -> admin bị đá ra login khi
  // refresh trang dù session vẫn hợp lệ. Một nơi quyết định là đủ.

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Trang quản trị</h1>
            <p className="text-xs text-gray-400">Quản lý dữ liệu hệ thống đặt vé xem phim</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300">{user?.fullName ?? user?.email ?? 'Admin'}</span>
            <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-semibold">{user?.role}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
