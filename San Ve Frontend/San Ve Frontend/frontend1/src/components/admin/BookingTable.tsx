// src/components/admin/BookingTable.tsx
// FIX BUG-02/WARN-02: table-container / admin-table / mobile-cards / card-* / booking-code
// đều là class không tồn tại. Viết lại bằng Tailwind, dùng TableShell/Th/Td của AdminUI.
import React from 'react';
import BookingStatusBadge from './BookingStatusBadge';
import { TableShell, Td, Th } from './AdminUI';
import { formatDateTime, formatVnd } from './adminUiHelpers';
import type { AdminBooking } from '../../types/admin';

interface Props {
  bookings: AdminBooking[];
}

const BookingTable: React.FC<Props> = ({ bookings }) => (
  <>
    {/* Desktop */}
    <div className="hidden md:block">
      <TableShell>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <Th>Mã đơn</Th>
              <Th>Khách hàng</Th>
              <Th>Phim</Th>
              <Th>Suất chiếu</Th>
              <Th>Ghế</Th>
              <Th>Tổng tiền</Th>
              <Th>Thanh toán</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {bookings.map((b) => (
              <tr key={b.bookingId} className="hover:bg-gray-800/50 transition">
                <Td className="font-mono text-blue-300 whitespace-nowrap">{b.bookingCode}</Td>
                <Td className="text-white">{b.customerName}</Td>
                <Td className="text-gray-300">{b.movieTitle}</Td>
                <Td className="text-gray-400 whitespace-nowrap">{formatDateTime(b.showtime)}</Td>
                <Td className="text-gray-300">{(b.seats ?? []).join(', ') || '—'}</Td>
                <Td className="text-yellow-400 whitespace-nowrap">{formatVnd(b.totalAmount)}</Td>
                <Td>
                  <BookingStatusBadge status={b.paymentStatus} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>

    {/* Mobile */}
    <div className="md:hidden space-y-3">
      {bookings.map((b) => (
        <div key={b.bookingId} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-blue-300 text-sm">{b.bookingCode}</span>
            <BookingStatusBadge status={b.paymentStatus} />
          </div>
          <dl className="space-y-1.5 text-sm">
            {[
              ['Khách hàng', b.customerName],
              ['Phim', b.movieTitle],
              ['Suất chiếu', formatDateTime(b.showtime)],
              ['Ghế', (b.seats ?? []).join(', ') || '—'],
              ['Tổng tiền', formatVnd(b.totalAmount)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-gray-200 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  </>
);

export default BookingTable;
