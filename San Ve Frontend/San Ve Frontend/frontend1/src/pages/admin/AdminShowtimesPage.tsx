// src/pages/admin/AdminShowtimesPage.tsx
//
// FIX BUG-01: bỏ toàn bộ class cũ không tồn tại (admin-page, page-header,
//   btn btn-primary, loading-state, error-state, empty-state, modal-overlay,
//   modal-content) — dùng Tailwind + component dùng chung trong AdminUI,
//   thống nhất với các trang admin còn lại (WARN-02).
//
// FIX BUG-04: xoá MOVIE_ID_MAP / ROOM_ID_MAP hardcode. Showtime trả về từ API
//   giờ đã có sẵn movieId / roomId thật nên không cần "dò ngược" theo tên nữa.
import React, { useMemo, useState } from 'react';
import ShowtimeTable from '../../components/admin/ShowtimeTable';
import ShowtimeForm from '../../components/admin/ShowtimeForm';
import ConfirmCancelModal from '../../components/admin/ConfirmCancelModal';
import { Btn, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Toast } from '../../components/admin/AdminUI';
import { inputClass, useToast } from '../../components/admin/adminUiHelpers';
import { useShowtimes } from '../../hooks/useShowtimes';
import { generateSeats, getShowtimeById, toLocalTime } from '../../api/showtimeApi';
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

  // FIX Lỗi 7: bảng phẳng không có filter -> càng nhiều suất chiếu càng khó dùng
  const [filterDate, setFilterDate] = useState('');
  const [filterMovieId, setFilterMovieId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  // FIX [mục 6.3]: state cho thao tác sinh ghế bù.
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  /**
   * Vá dữ liệu cũ: suất chiếu tạo TRƯỚC khi backend có auto-seed vẫn đang có
   * bảng showtime_seats rỗng. SeatBookingPage phát hiện được và hiện cảnh báo
   * "Suất chiếu này chưa có sơ đồ ghế", nhưng trước đây admin không có nút nào
   * để sửa. Endpoint idempotent nên bấm lại nhiều lần không gây hại.
   */
  const handleGenerateSeats = async (showtimeId: number) => {
    setGeneratingId(showtimeId);
    try {
      const res = await generateSeats(showtimeId);
      const created = Number(res?.created ?? 0);
      showToast(
        created > 0
          ? `Đã sinh ${created} ghế cho suất chiếu #${showtimeId}`
          : `Suất chiếu #${showtimeId} đã có đủ ghế, không cần sinh thêm`,
      );
    } catch (err) {
      showToast(
        (err as { message?: string })?.message ?? 'Sinh ghế thất bại',
        'error',
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const visibleShowtimes = useMemo(
    () =>
      showtimes.filter((s) => {
        if (filterDate && s.showDate !== filterDate) return false;
        if (filterMovieId && String(s.movieId) !== filterMovieId) return false;
        if (filterStatus && s.status !== filterStatus) return false;
        return true;
      }),
    [showtimes, filterDate, filterMovieId, filterStatus],
  );

  const hasFilter = Boolean(filterDate || filterMovieId || filterStatus);
  const clearFilters = () => {
    setFilterDate('');
    setFilterMovieId('');
    setFilterStatus('');
  };

  /** Chỉ liệt kê phim thực sự có suất chiếu — dropdown gọn hơn nhiều */
  const moviesWithShowtimes = useMemo(() => {
    const ids = new Set(showtimes.map((s) => s.movieId));
    return movies.filter((m) => ids.has(m.id));
  }, [movies, showtimes]);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingShowtime(null);
  };

  const handleFormSubmit = async (data: ShowtimeFormData) => {
    setSubmitting(true);
    try {
      const ok = editingShowtime
        ? await updateShowtime(editingShowtime.id, data, editingShowtime.updatedAt)
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
        subtitle={
          hasFilter
            ? `Hiển thị ${visibleShowtimes.length} / ${showtimes.length} suất chiếu`
            : `Tổng: ${showtimes.length} suất chiếu`
        }
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

      {/* Bộ lọc (FIX Lỗi 7) */}
      {!loading && showtimes.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Ngày chiếu">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phim">
              <select
                value={filterMovieId}
                onChange={(e) => setFilterMovieId(e.target.value)}
                className={inputClass}
              >
                <option value="">Tất cả phim</option>
                {moviesWithShowtimes.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputClass}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="OPEN">Đang mở bán</option>
                <option value="CLOSED">Đã đóng</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end mt-4">
            <Btn variant="ghost" onClick={clearFilters} disabled={!hasFilter}>
              Xóa bộ lọc
            </Btn>
          </div>
        </div>
      )}

      {loading ? (
        <Loading label="Đang tải suất chiếu..." />
      ) : showtimes.length === 0 ? (
        <EmptyState icon="🕐" label="Chưa có suất chiếu nào." />
      ) : visibleShowtimes.length === 0 ? (
        <EmptyState icon="🔍" label="Không có suất chiếu nào khớp bộ lọc." />
      ) : (
        <ShowtimeTable
          showtimes={visibleShowtimes}
          onEdit={(s) => {
            // FIX [mục 6.2]: mở form trên bản MỚI NHẤT từ server, không phải
            // bản đã cache trong danh sách. Nếu fetch lỗi thì vẫn mở bằng dữ
            // liệu cache — thà sửa được còn hơn chặn admin làm việc; lớp bảo
            // vệ thật là expectedUpdatedAt gửi kèm lúc lưu.
            setEditingShowtime(s);
            setIsFormOpen(true);
            void getShowtimeById(s.id)
              .then((fresh) => setEditingShowtime(fresh))
              .catch(() => { /* giữ nguyên bản cache */ });
          }}
          onCancel={(s) => setCancelingShowtime(s)}
          onGenerateSeats={(s) => void handleGenerateSeats(s.id)}
          generatingId={generatingId}
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
