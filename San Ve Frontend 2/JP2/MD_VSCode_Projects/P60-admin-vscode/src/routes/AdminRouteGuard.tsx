import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUser, isAdmin } from "../utils/auth";

export default function AdminRouteGuard() {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin(user)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
