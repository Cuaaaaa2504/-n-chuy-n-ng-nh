import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRouteGuard() {
  const { isLoggedIn, user, loading } = useAuth();
  const location = useLocation();

  // FIX [H-04]: đợi AuthContext verify xong mới quyết định redirect
  // Không có check này, admin refresh trang sẽ bị đá về /login trong lúc token đang được load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
