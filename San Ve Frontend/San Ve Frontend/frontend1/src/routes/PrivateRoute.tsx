
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  const bypassAuth =
    import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true';
  if (bypassAuth) return <Outlet />;

  if (!isLoggedIn)
    return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
