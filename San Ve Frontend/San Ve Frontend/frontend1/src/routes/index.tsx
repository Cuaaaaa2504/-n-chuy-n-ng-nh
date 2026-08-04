import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

// Guards
import PrivateRoute from './PrivateRoute';
import AdminRouteGuard from './AdminRouteGuard';
import StaffRouteGuard from './StaffRouteGuard';

import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
import SchedulePage from '../pages/SchedulePage';
import MovieDetailPage from '../pages/MovieDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import TermsPage from '../pages/TermsPage';
import NotFoundPage from '../pages/NotFoundPage';
import ForbiddenPage from '../pages/ForbiddenPage';

import ShowtimeSelectPage from '../pages/ShowtimeSelectPage';
import SeatBookingPage from '../pages/SeatBookingPage';
import PaymentPage from '../pages/PaymentPage';
import ComboPage from '../pages/ComboPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import MyTicketsPage from '../pages/MyTicketsPage';
import TicketDetailPage from '../pages/TicketDetailPage';
import ProfilePage from '../pages/ProfilePage';
import StaffCheckinPage from '../pages/StaffCheckinPage';

// Admin pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminMoviesPage from '../pages/admin/AdminMoviesPage';
import AdminShowtimesPage from '../pages/admin/AdminShowtimesPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminVouchersPage from '../pages/admin/AdminVouchersPage';
import AdminCinemasPage from '../pages/admin/AdminCinemasPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminRefundsPage from '../pages/admin/AdminRefundsPage';
import AdminRevenueReportPage from '../pages/admin/AdminRevenueReportPage';
import AdminAuditLogPage from '../pages/admin/AdminAuditLogPage';
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element={<MainLayout />}>

          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route element={<PrivateRoute />}>
            <Route path="/showtimes/:movieId" element={<ShowtimeSelectPage />} />
            <Route path="/movies/:id/seats" element={<SeatBookingPage />} />
            <Route path="/booking/:id" element={<SeatBookingPage />} />
            <Route path="/combo" element={<ComboPage />} />
            <Route path="/payment/local" element={<PaymentPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/tickets" element={<MyTicketsPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<StaffRouteGuard />}>
            <Route path="/staff/checkin" element={<StaffCheckinPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />

        </Route>

        <Route element={<AdminRouteGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="movies" element={<AdminMoviesPage />} />
            <Route path="showtimes" element={<AdminShowtimesPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="vouchers" element={<AdminVouchersPage />} />
            <Route path="cinemas" element={<AdminCinemasPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="refunds" element={<AdminRefundsPage />} />
            <Route path="reports" element={<AdminRevenueReportPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="audit-logs" element={<AdminAuditLogPage />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
