// src/routes/index.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

// Guards
import PrivateRoute from './PrivateRoute';
import AdminRouteGuard from './AdminRouteGuard';

// Public pages
import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
import MovieDetailPage from '../pages/MovieDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';
import ForbiddenPage from '../pages/ForbiddenPage';

// Protected pages (cần đăng nhập)
import ShowtimeSelectPage from '../pages/ShowtimeSelectPage';
import SeatBookingPage from '../pages/SeatBookingPage';
import PaymentPage from '../pages/PaymentPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import TicketPage from '../pages/TicketPage';
import TicketDetailPage from '../pages/TicketDetailPage';
import ProfilePage from '../pages/ProfilePage';

// Admin pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminMoviesPage from '../pages/admin/AdminMoviesPage';
import AdminShowtimesPage from '../pages/admin/AdminShowtimesPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Main layout (Navbar + Footer) ── */}
        <Route element={<MainLayout />}>

          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Protected (yêu cầu đăng nhập) */}
          <Route element={<PrivateRoute />}>
            <Route path="/showtimes/:movieId" element={<ShowtimeSelectPage />} />
            {/* FIX: thêm route /movies/:id/seats để SeatBookingPage nhận đúng movieId */}
            <Route path="/movies/:id/seats" element={<SeatBookingPage />} />
            <Route path="/booking/:id" element={<SeatBookingPage />} />
            {/* FIX: tách /payment/local riêng trước /:orderId để không bị match sai */}
            <Route path="/payment/local" element={<PaymentPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/my-tickets" element={<MyBookingsPage />} />
            <Route path="/tickets" element={<TicketPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />

        </Route>

        {/* ── Admin layout riêng (không có Navbar/Footer chính) ── */}
        <Route element={<AdminRouteGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="movies" element={<AdminMoviesPage />} />
            <Route path="showtimes" element={<AdminShowtimesPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
