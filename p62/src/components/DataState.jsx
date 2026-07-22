export function LoadingState({ label = 'Đang tải dữ liệu…' }) {
  return (
    <div className="data-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="data-state data-state--error" role="alert">
      <p>{error?.message || 'Đã có lỗi xảy ra.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label = 'Chưa có dữ liệu.' }) {
  return <div className="data-state"><p>{label}</p></div>;
}
