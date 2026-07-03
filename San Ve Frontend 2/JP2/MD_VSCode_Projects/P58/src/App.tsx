import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import MyBookingsPage from './pages/MyBookingsPage';
import './styles.css';

function TicketDetail() { return <main className="container"><h1>Chi tiết vé</h1><p>Trang chi tiết vé có thể nối tiếp từ modal QR.</p><Link to="/my-bookings">Quay lại</Link></main>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/my-bookings" replace />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
