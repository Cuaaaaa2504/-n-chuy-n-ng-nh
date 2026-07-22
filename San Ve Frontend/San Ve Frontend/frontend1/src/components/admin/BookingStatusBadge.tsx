// src/components/admin/BookingStatusBadge.tsx
// FIX BUG-02/WARN-02: class `status-badge status-paid`... không tồn tại -> dùng Pill của AdminUI.
import React from 'react';
import { Pill } from './AdminUI';
import type { AdminPaymentStatus } from '../../types/admin';

interface Props {
  status: AdminPaymentStatus;
}

const STATUS_MAP: Record<
  AdminPaymentStatus,
  { label: string; color: 'green' | 'yellow' | 'red' | 'purple' }
> = {
  PAID: { label: 'Đã thanh toán', color: 'green' },
  PENDING: { label: 'Chờ thanh toán', color: 'yellow' },
  FAILED: { label: 'Thanh toán lỗi', color: 'red' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'purple' },
};

const BookingStatusBadge: React.FC<Props> = ({ status }) => {
  const info = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  return <Pill color={info.color}>{info.label}</Pill>;
};

export default BookingStatusBadge;
