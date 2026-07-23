// src/components/admin/ShowtimeTable.tsx
// FIX BUG-01/WARN-02: bỏ hoàn toàn class cũ (table-container, admin-table,
// status-badge, mobile-cards...) — không file CSS nào trong dự án định nghĩa
// chúng. Chuyển sang Tailwind + component dùng chung của AdminUI.
import React from 'react';
import { Btn, Pill, TableShell, Td, Th, formatVnd } from './AdminUI';
import { toLocalTime } from '../../api/showtimeApi';
import type { Showtime, ShowtimeStatus } from '../../types/showtime';

interface Props {
  showtimes: Showtime[];
  onEdit: (showtime: Showtime) => void;
  onCancel: (showtime: Showtime) => void;
  /**
   * FIX [mục 6.3]: trigger POST /showtimes/admin/:id/generate-seats.
   * Endpoint đã tồn tại từ lâu nhưng không có nút nào gọi tới, nên suất chiếu
   * bị thiếu sơ đồ ghế (dữ liệu tạo trước khi có auto-seed) không thể vá được
   * từ giao diện.
   */
  onGenerateSeats: (showtime: Showtime) => void;
  /** id đang chạy sinh ghế — để disable nút và hiện trạng thái */
  generatingId?: number | null;
}

// Khớp CHECK constraint của backend: OPEN | CLOSED | CANCELLED
const STATUS_MAP: Record<ShowtimeStatus, { label: string; color: 'green' | 'gray' | 'red' }> = {
  OPEN: { label: 'Đang mở bán', color: 'green' },
  CLOSED: { label: 'Đã đóng', color: 'gray' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
};

const StatusBadge: React.FC<{ status: ShowtimeStatus }> = ({ status }) => {
  const info = STATUS_MAP[status] ?? STATUS_MAP.OPEN;
  return <Pill color={info.color}>{info.label}</Pill>;
};

const isLocked = (status: ShowtimeStatus) => status === 'CANCELLED' || status === 'CLOSED';

const formatDay = (value: string) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : '—';

const ShowtimeTable: React.FC<Props> = ({
  showtimes,
  onEdit,
  onCancel,
  onGenerateSeats,
  generatingId,
}) => (
  <>
    {/* Desktop */}
    <div className="hidden md:block">
      <TableShell>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <Th>ID</Th>
              <Th>Phim</Th>
              <Th>Rạp</Th>
              <Th>Phòng</Th>
              <Th>Ngày</Th>
              <Th>Giờ chiếu</Th>
              <Th>Giá vé</Th>
              <Th>Trạng thái</Th>
              <Th>Thao tác</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {showtimes.map((s) => (
              <tr key={s.id} className="hover:bg-gray-800/50 transition">
                <Td className="text-gray-500">#{s.id}</Td>
                <Td className="font-medium text-white">{s.movieTitle}</Td>
                <Td className="text-gray-300">{s.cinemaName}</Td>
                <Td className="text-gray-300">{s.roomName}</Td>
                <Td className="text-gray-300 whitespace-nowrap">{formatDay(s.showDate)}</Td>
                <Td className="text-gray-300 whitespace-nowrap">
                  {toLocalTime(s.startTime)} – {toLocalTime(s.endTime)}
                </Td>
                <Td className="text-yellow-400 whitespace-nowrap">{formatVnd(s.basePrice)}</Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Btn variant="primary" onClick={() => onEdit(s)} disabled={isLocked(s.status)}>
                      Sửa
                    </Btn>
                    <Btn
                      variant="purple"
                      onClick={() => onGenerateSeats(s)}
                      disabled={generatingId === s.id}
                    >
                      {generatingId === s.id ? '⏳' : '🪑 Sinh ghế'}
                    </Btn>
                    <Btn variant="danger" onClick={() => onCancel(s)} disabled={isLocked(s.status)}>
                      Hủy
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>

    {/* Mobile */}
    <div className="md:hidden space-y-3">
      {showtimes.map((s) => (
        <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-semibold">#{s.id}</span>
            <StatusBadge status={s.status} />
          </div>
          <dl className="space-y-1.5 text-sm">
            {[
              ['Phim', s.movieTitle],
              ['Rạp', s.cinemaName],
              ['Phòng', s.roomName],
              ['Ngày', formatDay(s.showDate)],
              ['Giờ', `${toLocalTime(s.startTime)} – ${toLocalTime(s.endTime)}`],
              ['Giá vé', formatVnd(s.basePrice)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-gray-200 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2 mt-4">
            <Btn variant="primary" className="flex-1" onClick={() => onEdit(s)} disabled={isLocked(s.status)}>
              Sửa
            </Btn>
            <Btn
              variant="purple"
              className="flex-1"
              onClick={() => onGenerateSeats(s)}
              disabled={generatingId === s.id}
            >
              {generatingId === s.id ? '⏳' : '🪑 Sinh ghế'}
            </Btn>
            <Btn variant="danger" className="flex-1" onClick={() => onCancel(s)} disabled={isLocked(s.status)}>
              Hủy
            </Btn>
          </div>
        </div>
      ))}
    </div>
  </>
);

export default ShowtimeTable;
