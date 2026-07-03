import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PaymentPage from './pages/PaymentPage';
import TicketPage from './pages/TicketPage';
import TicketDetailPage from './pages/TicketDetailPage';
import './styles/payment.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/payment/demo-order-1" replace />} />
        <Route path="/payment/:orderId" element={<PaymentPage />} />
        <Route path="/tickets" element={<TicketPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
