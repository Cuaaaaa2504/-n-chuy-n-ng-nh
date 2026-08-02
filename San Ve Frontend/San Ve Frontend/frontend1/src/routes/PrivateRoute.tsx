// src/routes/PrivateRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  // ✅ Hooks luôn gọi trước, không bao giờ sau điều kiện
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  // ✅ Bypass auth khi test local — check sau hooks
  const bypassAuth =
    import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true';
  if (bypassAuth) return <Outlet />;

  if (!isLoggedIn)
    return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
