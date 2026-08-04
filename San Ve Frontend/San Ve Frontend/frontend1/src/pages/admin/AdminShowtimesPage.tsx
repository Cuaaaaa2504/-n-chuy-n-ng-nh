import React, { useMemo, useState } from 'react';
import ShowtimeTable from '../../components/admin/ShowtimeTable';
import ShowtimeForm from '../../components/admin/ShowtimeForm';
import ConfirmCancelModal from '../../components/admin/ConfirmCancelModal';
import {
  Btn,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  PageHeader,
  Toast,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';
import { useShowtimes } from '../../hooks/useShowtimes';
import { generateSeats, getShowtimeById, toLocalTime } from '../../api/showtimeApi';
import type { Showtime, ShowtimeFormData } from '../../types/showtime';

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

  const [generatingId, setGeneratingId] = useState<number | null>(null);

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
