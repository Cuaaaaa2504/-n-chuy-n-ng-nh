import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminShowtimesPage from './pages/AdminShowtimesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="showtimes" replace />} />
        <Route path="showtimes" element={<AdminShowtimesPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/admin/showtimes" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
