// src/pages/admin/AdminShowtimesPage.tsx
//
// FIX BUG-01: bỏ toàn bộ class cũ không tồn tại (admin-page, page-header,
//   btn btn-primary, loading-state, error-state, empty-state, modal-overlay,
//   modal-content) — dùng Tailwind + component dùng chung trong AdminUI,
//   thống nhất với các trang admin còn lại (WARN-02).
//
// FIX BUG-04: xoá MOVIE_ID_MAP / ROOM_ID_MAP hardcode. Showtime trả về từ API
//   giờ đã có sẵn movieId / roomId thật nên không cần "dò ngược" theo tên nữa.
import React, { useState } from 'react';
import ShowtimeTable from '../../components/admin/ShowtimeTable';
import ShowtimeForm from '../../components/admin/ShowtimeForm';
import ConfirmCancelModal from '../../components/admin/ConfirmCancelModal';
import {
  Btn,
  EmptyState,
  ErrorBanner,
  Loading,
  Modal,
  PageHeader,
  Toast,
  useToast,
} from '../../components/admin/AdminUI';
import { useShowtimes } from '../../hooks/useShowtimes';
import { toLocalTime } from '../../api/showtimeApi';
import type { Showtime, ShowtimeFormData } from '../../types/showtime';

/** Showtime (dữ liệu thật) -> ShowtimeFormData, không còn map tên cứng */
const toFormData = (s: Showtime): ShowtimeFormData => ({
  movieId: String(s.movieId ?? ''),
  roomId: String(s.roomId ?? ''),
  showDate: s.showDate,
  startTime: toLocalTime(s.startTime),
  endTime: toLocalTime(s.endTime),
  basePrice: String(s.basePrice ?? ''),
});

const AdminShowtimesPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState<Showtime | null>(null);
  const [cancelingShowtime, setCancelingShowtime] = useState<Showtime | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    showtimes,
    movies,
    rooms,
    loading,
    error,
    fetchShowtimes,
    addShowtime,
    updateShowtime,
    cancelShowtime,
  } = useShowtimes();
  const { toast, showToast } = useToast();

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingShowtime(null);
  };

  const handleFormSubmit = async (data: ShowtimeFormData) => {
    setSubmitting(true);
    try {
      const ok = editingShowtime
        ? await updateShowtime(editingShowtime.id, data)
        : await addShowtime(data);
      if (ok) {
        showToast(editingShowtime ? 'Đã cập nhật suất chiếu' : 'Đã thêm suất chiếu mới');
        closeForm();
      } else {
        showToast('Lưu suất chiếu thất bại', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingShowtime) return;
    setSubmitting(true);
    try {
      const ok = await cancelShowtime(cancelingShowtime.id);
      showToast(ok ? 'Đã hủy suất chiếu' : 'Hủy suất chiếu thất bại', ok ? 'success' : 'error');
      if (ok) setCancelingShowtime(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Toast toast={toast} />

      <PageHeader
        title="Quản lý Suất Chiếu"
        subtitle={`Tổng: ${showtimes.length} suất chiếu`}
        actions={
          <>
            <Btn variant="ghost" onClick={() => void fetchShowtimes()} disabled={loading}>
              🔄 Làm mới
            </Btn>
            <Btn
              variant="primary"
              onClick={() => {
                setEditingShowtime(null);
                setIsFormOpen(true);
              }}
            >
              + Thêm suất chiếu
            </Btn>
          </>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <Loading label="Đang tải suất chiếu..." />
      ) : showtimes.length === 0 ? (
        <EmptyState icon="🕐" label="Chưa có suất chiếu nào." />
      ) : (
        <ShowtimeTable
          showtimes={showtimes}
          onEdit={(s) => {
            setEditingShowtime(s);
            setIsFormOpen(true);
          }}
          onCancel={(s) => setCancelingShowtime(s)}
        />
      )}

      {isFormOpen && (
        <Modal
          title={editingShowtime ? 'Sửa suất chiếu' : 'Thêm suất chiếu mới'}
          onClose={closeForm}
        >
          <ShowtimeForm
            showtime={editingShowtime ? toFormData(editingShowtime) : null}
            movies={movies}
            rooms={rooms}
            submitting={submitting}
            onSubmit={(data) => void handleFormSubmit(data)}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {cancelingShowtime && (
        <ConfirmCancelModal
          showtime={cancelingShowtime}
          submitting={submitting}
          onConfirm={() => void handleConfirmCancel()}
          onCancel={() => setCancelingShowtime(null)}
        />
      )}
    </div>
  );
};

export default AdminShowtimesPage;
