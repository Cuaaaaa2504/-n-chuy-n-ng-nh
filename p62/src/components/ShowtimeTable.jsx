import useMediaQuery from '../hooks/useMediaQuery';
import useTableView from '../hooks/useTableView';
import { formatCurrency, formatDate, orDash } from '../utils/format';
import { SHOWTIME_STATUS } from '../utils/status';
import StatusBadge from './StatusBadge';
import SortableTh from './SortableTh';
import Pagination from './Pagination';
import { EmptyState } from './DataState';

export default function ShowtimeTable({ showtimes, onEdit, onCancel }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const view = useTableView(showtimes, { pageSize: 20, defaultSort: { key: 'date', dir: 'desc' } });

  if (showtimes.length === 0) return <EmptyState label="Chưa có suất chiếu nào." />;

  // Render MỘT lần theo kích thước màn hình, không render 2 bản rồi ẩn bằng CSS.
  return (
    <>
      {isDesktop ? (
        <table className="data-table">
          <caption className="sr-only">Danh sách suất chiếu</caption>
          <thead>
            <tr>
              <SortableTh label="Phim"  sortKey="movieTitle" sort={view.sort} onSort={view.toggleSort} />
              <SortableTh label="Rạp"   sortKey="cinemaName" sort={view.sort} onSort={view.toggleSort} />
              <SortableTh label="Phòng" sortKey="roomName"   sort={view.sort} onSort={view.toggleSort} />
              <SortableTh label="Ngày"  sortKey="date"       sort={view.sort} onSort={view.toggleSort} />
              <th scope="col">Giờ</th>
              <SortableTh label="Giá vé" sortKey="price"     sort={view.sort} onSort={view.toggleSort} />
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((st) => (
              <tr key={st.id}>
                <td>{orDash(st.movieTitle)}</td>
                <td>{orDash(st.cinemaName)}</td>
                <td>{orDash(st.roomName)}</td>
                <td>{formatDate(st.date)}</td>
                <td>{orDash(st.startTime)} – {orDash(st.endTime)}</td>
                <td>{formatCurrency(st.price)}</td>
                <td><StatusBadge map={SHOWTIME_STATUS} status={st.status} /></td>
                <td className="cell-actions">
                  <button type="button" className="btn btn--sm" onClick={() => onEdit(st)}>Sửa</button>
                  <button type="button" className="btn btn--sm btn--danger"
                          onClick={() => onCancel(st)}
                          disabled={st.status === 'CANCELLED'}>
                    Hủy suất
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="card-list">
          {view.rows.map((st) => (
            <li key={st.id} className="card">
              <div className="card__title">{orDash(st.movieTitle)}</div>
              <dl className="card__meta">
                <dt>Rạp</dt><dd>{orDash(st.cinemaName)}</dd>
                <dt>Phòng</dt><dd>{orDash(st.roomName)}</dd>
                <dt>Suất</dt><dd>{formatDate(st.date)} · {orDash(st.startTime)}–{orDash(st.endTime)}</dd>
                <dt>Giá vé</dt><dd>{formatCurrency(st.price)}</dd>
              </dl>
              <StatusBadge map={SHOWTIME_STATUS} status={st.status} />
              <div className="cell-actions">
                <button type="button" className="btn btn--sm" onClick={() => onEdit(st)}>Sửa</button>
                <button type="button" className="btn btn--sm btn--danger"
                        onClick={() => onCancel(st)} disabled={st.status === 'CANCELLED'}>
                  Hủy suất
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={view.page} totalPages={view.totalPages} total={view.total} onChange={view.setPage} />
    </>
  );
}
