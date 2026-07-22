export default function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return <p className="pagination__info">{total} bản ghi</p>;

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" className="btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Trước
      </button>
      <span className="pagination__info">
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <button type="button" className="btn" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Sau
      </button>
    </nav>
  );
}
