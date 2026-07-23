// src/routes/StaffRouteGuard.tsx
//
// FIX [mục 7.2]: guard cho các màn hình vận hành tại rạp.
// Giống AdminRouteGuard nhưng chấp nhận cả STAFF — backend cũng cho phép
// @Roles('STAFF', 'ADMIN') trên endpoint check-in, nên hai bên khớp nhau.
//
// Lưu ý: guard phía client chỉ để tránh hiển thị màn hình vô nghĩa cho người
// không có quyền. Nó KHÔNG phải lớp bảo vệ — quyền thật do RolesGuard ở backend
// quyết định.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StaffRouteGuard() {
  const { isLoggedIn, user, loading } = useAuth();
  const location = useLocation();

  // Đợi AuthContext verify xong mới quyết định redirect — nếu không, nhân viên
  // F5 giữa ca sẽ bị đá về /login trong lúc token đang được load.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== 'STAFF' && user?.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
