import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Xác nhận', danger = false, onConfirm, onClose, children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (open) { setBusy(false); setError(null); } }, [open]);

  const handleConfirm = async () => {
    if (busy) return;           // chặn double-click -> tránh gửi 2 request
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Thao tác thất bại.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Quay lại</button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </>
      }
    >
      {description && <p>{description}</p>}
      {children}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
