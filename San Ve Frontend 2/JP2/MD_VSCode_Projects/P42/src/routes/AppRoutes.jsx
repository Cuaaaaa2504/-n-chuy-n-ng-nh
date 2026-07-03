import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import PrivateRoute from './PrivateRoute';
import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
import MovieDetailPage from '../pages/MovieDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

function Placeholder({ title }) {
  return <section className="page"><h1>{title}</h1><p>Trang đã được bảo vệ bằng PrivateRoute.</p></section>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/movies/:movieId" element={<MovieDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/booking/:movieId" element={<Placeholder title="Chọn ghế" />} />
          <Route path="/payment/:orderId" element={<Placeholder title="Thanh toán" />} />
          <Route path="/my-tickets" element={<Placeholder title="Vé của tôi" />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
