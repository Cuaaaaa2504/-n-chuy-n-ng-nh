// src/routes/index.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

// Guards
import PrivateRoute from './PrivateRoute';
import AdminRouteGuard from './AdminRouteGuard';
// FIX [mục 7.2]: guard riêng cho nhân viên rạp (STAFF hoặc ADMIN)
import StaffRouteGuard from './StaffRouteGuard';

// Public pages
import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
// FIX Lỗi 4: trang lịch chiếu tổng hợp dùng GET /showtimes
import SchedulePage from '../pages/SchedulePage';
import MovieDetailPage from '../pages/MovieDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';
import ForbiddenPage from '../pages/ForbiddenPage';

// Protected pages (cần đăng nhập)
import ShowtimeSelectPage from '../pages/ShowtimeSelectPage';
import SeatBookingPage from '../pages/SeatBookingPage';
import PaymentPage from '../pages/PaymentPage';
// Bước chọn combo bắp nước, chèn giữa SeatBookingPage và PaymentPage
import ComboPage from '../pages/ComboPage';
import MyBookingsPage from '../pages/MyBookingsPage';
// FIX BUG-02: MyTicketsPage là trang vé đầy đủ (QR, trạng thái, countdown, tab
// holding/paid qua ?tab=). Trước đây file này không được đăng ký route nào nên
// người dùng không bao giờ vào được. TicketPage cũ là stub -> đã bỏ khỏi router.
import MyTicketsPage from '../pages/MyTicketsPage';
import TicketDetailPage from '../pages/TicketDetailPage';
import ProfilePage from '../pages/ProfilePage';
// FIX [mục 7.2]: màn hình soát vé tại rạp — trước đây POST /tickets/:code/checkin
// không có bất kỳ UI nào gọi tới.
import StaffCheckinPage from '../pages/StaffCheckinPage';

// Admin pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminMoviesPage from '../pages/admin/AdminMoviesPage';
import AdminShowtimesPage from '../pages/admin/AdminShowtimesPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
// 6 trang admin bổ sung theo báo cáo thiếu sót
import AdminVouchersPage from '../pages/admin/AdminVouchersPage';
import AdminCinemasPage from '../pages/admin/AdminCinemasPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminRefundsPage from '../pages/admin/AdminRefundsPage';
import AdminRevenueReportPage from '../pages/admin/AdminRevenueReportPage';
import AdminAuditLogPage from '../pages/admin/AdminAuditLogPage';
// FIX [mục 3.5]: form gửi thông báo — POST /notifications/admin/push trước đây
// không có form nào trong dashboard.
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Main layout (Navbar + Footer) ── */}
        <Route element={<MainLayout />}>

          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
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
            {/* Bước 2 của luồng đặt vé: giữ ghế -> /combo -> tạo booking -> /payment/:id */}
            <Route path="/combo" element={<ComboPage />} />
            {/* FIX: tách /payment/local riêng trước /:orderId để không bị match sai */}
            <Route path="/payment/local" element={<PaymentPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            {/* Navbar link tới /my-tickets?tab=holding | ?tab=paid -> MyTicketsPage */}
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/tickets" element={<MyTicketsPage />} />
            {/* Danh sách đơn đặt vé (MyBookingsPage) tách sang route riêng */}
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ── Nhân viên rạp (STAFF/ADMIN) ── */}
          <Route element={<StaffRouteGuard />}>
            <Route path="/staff/checkin" element={<StaffCheckinPage />} />
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
