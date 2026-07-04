import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminShowtimesPage from './pages/AdminShowtimesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import './styles/admin-booking.css';

function App() {
  return (
    <Router>
      <div className="admin-app">
        <nav className="admin-nav">
          <div className="nav-container">
            <h1 className="nav-title">🎬 Admin Dashboard</h1>
            <div className="nav-links">
              <Link to="/admin/showtimes" className="nav-link">Quản lý Suất Chiếu</Link>
              <Link to="/admin/bookings" className="nav-link">Quản lý Đơn Đặt Vé</Link>
            </div>
          </div>
        </nav>
        <main className="admin-main">
          <Routes>
            <Route path="/admin/showtimes" element={<AdminShowtimesPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/" element={<AdminShowtimesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;