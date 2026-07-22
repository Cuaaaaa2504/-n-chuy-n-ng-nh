import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingState } from '../components/DataState';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  if (role && !roles.includes(role)) return <Navigate to="/403" replace />;

  return children;
}
