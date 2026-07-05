import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from '../layouts/MainLayout';

// Guards
import PrivateRoute from './PrivateRoute';

// Public pages
import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
import MovieDetailPage from '../pages/MovieDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

// Protected pages (cần đăng nhập)
import ShowtimeSelectPage from '../pages/ShowtimeSelectPage';
import SeatBookingPage from '../pages/SeatBookingPage';
import MyBookingsPage from '../pages/MyBookingsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tất cả route dùng chung MainLayout (Navbar + Footer) */}
        <Route element={<MainLayout />}>

          {/* ── Public ── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Protected (yêu cầu đăng nhập) ── */}
          <Route element={<PrivateRoute />}>
            <Route path="/showtimes/:movieId" element={<ShowtimeSelectPage />} />
            <Route path="/booking/:id" element={<SeatBookingPage />} />
            <Route path="/my-tickets" element={<MyBookingsPage />} />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<NotFoundPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
