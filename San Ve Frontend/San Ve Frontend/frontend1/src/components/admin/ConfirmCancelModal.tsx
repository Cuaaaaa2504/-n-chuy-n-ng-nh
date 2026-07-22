// src/components/admin/ConfirmCancelModal.tsx
// FIX BUG-01: modal-overlay / modal-content / confirm-modal / warning-text đều là
// class không tồn tại -> modal hiện ra như text trần giữa trang. Dùng Tailwind.
import React from 'react';
import { Btn } from './AdminUI';
import { toLocalTime } from '../../api/showtimeApi';
import type { Showtime } from '../../types/showtime';

interface Props {
  showtime: Showtime | null;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

const ConfirmCancelModal: React.FC<Props> = ({
  showtime,
  onConfirm,
  onCancel,
  submitting = false,
}) => (
  <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
      <h3 className="text-lg font-bold text-white mb-2">Xác nhận hủy suất chiếu</h3>
      <p className="text-gray-400 text-sm mb-4">Bạn có chắc chắn muốn hủy suất chiếu này?</p>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Phim</span>
          <span className="text-white text-right">{showtime?.movieTitle ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Rạp / Phòng</span>
          <span className="text-gray-200 text-right">
            {showtime?.cinemaName ?? '—'} · {showtime?.roomName ?? '—'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Thời gian</span>
          <span className="text-gray-200 text-right">
            {showtime?.showDate ?? '—'} · {toLocalTime(showtime?.startTime ?? '')} –{' '}
            {toLocalTime(showtime?.endTime ?? '')}
          </span>
        </div>
      </div>

      <p className="text-yellow-400 text-xs mt-4">⚠️ Hành động này không thể hoàn tác.</p>

      <div className="flex justify-end gap-3 mt-6">
        <Btn variant="ghost" onClick={onCancel}>
          Hủy bỏ
        </Btn>
        <Btn variant="danger" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Đang xử lý...' : 'Xác nhận hủy'}
        </Btn>
      </div>
    </div>
  </div>
);

export default ConfirmCancelModal;
