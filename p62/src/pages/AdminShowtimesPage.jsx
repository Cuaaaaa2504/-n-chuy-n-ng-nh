import { useCallback, useEffect, useState } from 'react';
import useShowtimes from '../hooks/useShowtimes';
import showtimeService from '../services/showtimeService';
import ShowtimeTable from '../components/ShowtimeTable';
import ShowtimeForm from '../components/ShowtimeForm';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { LoadingState, ErrorState } from '../components/DataState';

export default function AdminShowtimesPage() {
  const { showtimes, loading, error, refetch, createShowtime, updateShowtime, cancelShowtime } =
    useShowtimes();

  const [editing, setEditing] = useState(null);   // null | 'new' | showtime
  const [cancelTarget, setCancelTarget] = useState(null);
  const [affected, setAffected] = useState(null);
  const [refundBookings, setRefundBookings] = useState(true);

  useEffect(() => {
    if (!cancelTarget) { setAffected(null); return; }
    setRefundBookings(true);
    showtimeService.getAffectedBookings(cancelTarget.id)
      .then(setAffected)
      .catch(() => setAffected(null));
  }, [cancelTarget]);

  const handleSubmit = useCallback(
    async (payload) => {
      if (editing && editing !== 'new') await updateShowtime(editing.id, payload);
      else await createShowtime(payload);
      setEditing(null);
    },
    [editing, createShowtime, updateShowtime]
  );

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Quản lý suất chiếu</h1>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          + Thêm suất chiếu
        </button>
      </header>

      {/* Loading/error chỉ thay thế vùng bảng, không unmount cả trang */}
      <div className="admin-page__content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <ShowtimeTable showtimes={showtimes} onEdit={setEditing} onCancel={setCancelTarget} />
        )}
      </div>

      <Modal
        open={editing !== null}
        title={editing && editing !== 'new' ? 'Sửa suất chiếu' : 'Thêm suất chiếu'}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <ShowtimeForm
            showtime={editing === 'new' ? null : editing}
            existingShowtimes={showtimes}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={cancelTarget !== null}
        danger
        title="Hủy suất chiếu"
        confirmLabel="Hủy suất chiếu"
        onClose={() => setCancelTarget(null)}
        onConfirm={() =>
          cancelShowtime(cancelTarget.id, { reason: 'ADMIN_CANCELLED', refundBookings })
        }
      >
        <p>
          Suất <strong>{cancelTarget?.movieTitle}</strong> — {cancelTarget?.date}{' '}
          {cancelTarget?.startTime} tại {cancelTarget?.roomName}.
        </p>

        {affected ? (
          <div className="alert alert--warning">
            <p>
              Suất này đang có <strong>{affected.count ?? 0}</strong> đơn đã đặt,
              tổng tiền {affected.totalAmount ?? 0} ₫.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={refundBookings}
                onChange={(e) => setRefundBookings(e.target.checked)}
              />
              Hoàn tiền và gửi thông báo cho toàn bộ khách đã đặt
            </label>
            {!refundBookings && (
              <p className="form-error">
                Nếu không hoàn tiền, các đơn sẽ chuyển sang trạng thái “Đã hủy” mà khách không được
                bồi hoàn. Chỉ chọn khi bạn xử lý thủ công.
              </p>
            )}
          </div>
        ) : (
          <p className="form-hint">Đang kiểm tra các đơn đã đặt…</p>
        )}

        <p>Thao tác này không thể hoàn tác.</p>
      </ConfirmDialog>
    </section>
  );
}
