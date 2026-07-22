import { BOOKING_STATUS } from '../utils/status';

// Component tách riêng và KHÔNG bị unmount khi loading -> input không mất focus.
export default function BookingFilters({ keyword, onKeywordChange, filters, onFiltersChange }) {
  const set = (patch) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="filters">
      <div className="form-row">
        <label htmlFor="f-keyword">Tìm kiếm</label>
        <input
          id="f-keyword"
          type="search"
          value={keyword}
          placeholder="Mã đơn, tên khách, số điện thoại…"
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="f-status">Trạng thái</label>
        <select id="f-status" value={filters.status || ''} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Tất cả</option>
          {Object.entries(BOOKING_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="f-from">Từ ngày</label>
        <input id="f-from" type="date" value={filters.fromDate || ''} onChange={(e) => set({ fromDate: e.target.value })} />
      </div>

      <div className="form-row">
        <label htmlFor="f-to">Đến ngày</label>
        <input id="f-to" type="date" value={filters.toDate || ''} onChange={(e) => set({ toDate: e.target.value })} />
      </div>

      <button
        type="button"
        className="btn"
        onClick={() => { onKeywordChange(''); onFiltersChange({ status: '', fromDate: '', toDate: '' }); }}
      >
        Xóa lọc
      </button>
    </div>
  );
}
