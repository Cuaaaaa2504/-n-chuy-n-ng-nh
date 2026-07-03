import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import { getCurrentUser, logout, type CurrentUser } from "../utils/auth";
import "../styles/admin.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  useEffect(() => {
    const syncAuthState = () => {
      const latestUser = getCurrentUser();
      setUser(latestUser);

      if (!latestUser) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("auth-changed", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("auth-changed", syncAuthState);
    };
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Trang quản trị</h1>
            <p>Quản lý dữ liệu hệ thống đặt vé xem phim</p>
          </div>

          <div className="admin-user">
            <span>{user?.fullName || user?.email || "Không xác định"}</span>
            <strong>{user?.role || "Chưa có vai trò"}</strong>
            <button className="admin-logout-button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
