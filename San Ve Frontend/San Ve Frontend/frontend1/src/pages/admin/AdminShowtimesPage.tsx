// src/pages/admin/AdminShowtimesPage.tsx
import React, { useState } from 'react';
import ShowtimeTable from '../../components/admin/ShowtimeTable';
import ShowtimeForm from '../../components/admin/ShowtimeForm';
import ConfirmCancelModal from '../../components/admin/ConfirmCancelModal';
import { useShowtimes } from '../../hooks/useShowtimes';
import type { Showtime, ShowtimeFormData } from '../../hooks/useShowtimes';

// Derive ShowtimeFormData from an existing Showtime for the edit form.
// movieId/roomId are reverse-mapped from display names.
const MOVIE_ID_MAP: Record<string, string> = { 'Avengers Endgame': '1', 'Avatar 2': '2', 'Spider-Man': '3' };
const ROOM_ID_MAP:  Record<string, string>  = { 'Room 1': '1', 'Room 2': '2', 'Room 3': '3' };

const toFormData = (s: Showtime): ShowtimeFormData => ({
  movieId:   MOVIE_ID_MAP[s.movieTitle] ?? '',
  roomId:    ROOM_ID_MAP[s.roomName]    ?? '',
  showDate:  s.showDate,
  startTime: s.startTime,
  endTime:   s.endTime,
});

const AdminShowtimesPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState<Showtime | null>(null);
  const [cancelingShowtime, setCancelingShowtime] = useState<Showtime | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const { showtimes, loading, error, addShowtime, updateShowtime, cancelShowtime } = useShowtimes();

  const handleAddShowtime = () => { setEditingShowtime(null); setIsFormOpen(true); };

  // Parameter type matches ShowtimeTable's local Showtime (no movieId/roomId)
  const handleEditShowtime   = (s: Showtime) => { setEditingShowtime(s);   setIsFormOpen(true); };
  const handleCancelShowtime = (s: Showtime) => { setCancelingShowtime(s); setIsCancelModalOpen(true); };

  // onSubmit receives ShowtimeFormData — matches ShowtimeForm's Props exactly
  const handleFormSubmit = async (data: ShowtimeFormData) => {
    const success = editingShowtime
      ? await updateShowtime(editingShowtime.id, data)
      : await addShowtime(data);
    if (success) { setIsFormOpen(false); setEditingShowtime(null); }
  };

  const handleConfirmCancel = async () => {
    if (cancelingShowtime) {
      const success = await cancelShowtime(cancelingShowtime.id);
      if (success) { setIsCancelModalOpen(false); setCancelingShowtime(null); }
    }
  };

  if (loading) return <div className="loading-state">Đang tải dữ liệu...</div>;
  if (error)   return <div className="error-state">Không thể tải dữ liệu. Vui lòng thử lại.</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Quản lý Suất Chiếu</h2>
        <button className="btn btn-primary" onClick={handleAddShowtime}>+ Thêm suất chiếu</button>
      </div>

      {showtimes.length === 0
        ? <div className="empty-state">Chưa có suất chiếu nào.</div>
        : (
          <ShowtimeTable
            showtimes={showtimes}
            onEdit={handleEditShowtime}
            onCancel={handleCancelShowtime}
          />
        )
      }

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ShowtimeForm
              showtime={editingShowtime ? toFormData(editingShowtime) : null}
              onSubmit={handleFormSubmit}
              onCancel={() => { setIsFormOpen(false); setEditingShowtime(null); }}
            />
          </div>
        </div>
      )}

      {isCancelModalOpen && (
        <ConfirmCancelModal
          showtime={cancelingShowtime}
          onConfirm={handleConfirmCancel}
          onCancel={() => { setIsCancelModalOpen(false); setCancelingShowtime(null); }}
        />
      )}
    </div>
  );
};

export default AdminShowtimesPage;
