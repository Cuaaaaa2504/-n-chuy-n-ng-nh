import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import AdminRouteGuard from "./routes/AdminRouteGuard";
import AdminLayout from "./layouts/AdminLayout";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminMoviesPage from "./pages/admin/AdminMoviesPage";
import AdminShowtimesPage from "./pages/admin/AdminShowtimesPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import NotFoundPage from "./pages/NotFoundPage";
import { saveCurrentUser } from "./utils/auth";

function HomePage() {
  return (
    <main className="center-page">
      <section className="center-card">
        <h1>Trang chủ</h1>
        <p>Demo hệ thống đặt vé xem phim.</p>
        <div className="center-actions">
          <Link to="/login" className="primary-link">
            Đăng nhập demo
          </Link>
          <Link to="/admin" className="secondary-link">
            Vào Admin
          </Link>
        </div>
      </section>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/admin";

  const loginAsAdmin = () => {
    saveCurrentUser({
      id: 1,
      fullName: "Admin Demo",
      email: "admin@gmail.com",
      role: "ADMIN",
    });

    navigate(from, { replace: true });
  };

  const loginAsUser = () => {
    saveCurrentUser({
      id: 2,
      fullName: "User Demo",
      email: "user@gmail.com",
      role: "USER",
    });

    navigate("/", { replace: true });
  };

  return (
    <main className="center-page">
      <section className="center-card">
        <h1>Đăng nhập demo</h1>
        <p>Chọn vai trò để kiểm tra route guard cho khu vực quản trị.</p>
        <div className="center-actions">
          <button onClick={loginAsAdmin}>Đăng nhập Admin</button>
          <button onClick={loginAsUser}>Đăng nhập User</button>
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<AdminRouteGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="movies" element={<AdminMoviesPage />} />
            <Route path="showtimes" element={<AdminShowtimesPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
