import useMediaQuery from '../hooks/useMediaQuery';
import useTableView from '../hooks/useTableView';
import { formatCurrency, formatSeats, formatDateTime, orDash } from '../utils/format';
import { BOOKING_STATUS } from '../utils/status';
import StatusBadge from './StatusBadge';
import SortableTh from './SortableTh';
import Pagination from './Pagination';
import { EmptyState } from './DataState';

export default function BookingTable({ bookings }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const view = useTableView(bookings, { pageSize: 25, defaultSort: { key: 'createdAt', dir: 'desc' } });

  if (bookings.length === 0) return <EmptyState label="Không có đơn nào khớp bộ lọc." />;

  return (
    <>
      {isDesktop ? (
        <table className="data-table">
          <caption className="sr-only">Danh sách đơn đặt vé</caption>
          <thead>
            <tr>
              <SortableTh label="Mã đơn"  sortKey="code"        sort={view.sort} onSort={view.toggleSort} />
              <SortableTh label="Khách"   sortKey="customerName" sort={view.sort} onSort={view.toggleSort} />
              <th scope="col">Phim</th>
              <th scope="col">Suất</th>
              <th scope="col">Ghế</th>
              <SortableTh label="Tổng tiền" sortKey="totalAmount" sort={view.sort} onSort={view.toggleSort} />
              <SortableTh label="Đặt lúc" sortKey="createdAt"    sort={view.sort} onSort={view.toggleSort} />
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((b) => (
              <tr key={b.id}>
                <td>{orDash(b.code ?? b.id)}</td>
                <td>{orDash(b.customerName)}</td>
                <td>{orDash(b.movieTitle)}</td>
                <td>{orDash(b.showtimeDate)} {orDash(b.showtimeStart)}</td>
                <td>{formatSeats(b.seats)}</td>
                <td>{formatCurrency(b.totalAmount)}</td>
                <td>{formatDateTime(b.createdAt)}</td>
                <td><StatusBadge map={BOOKING_STATUS} status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="card-list">
          {view.rows.map((b) => (
            <li key={b.id} className="card">
              <div className="card__title">{orDash(b.code ?? b.id)}</div>
              <dl className="card__meta">
                <dt>Khách</dt><dd>{orDash(b.customerName)}</dd>
                <dt>Phim</dt><dd>{orDash(b.movieTitle)}</dd>
                <dt>Ghế</dt><dd>{formatSeats(b.seats)}</dd>
                <dt>Tổng tiền</dt><dd>{formatCurrency(b.totalAmount)}</dd>
                <dt>Đặt lúc</dt><dd>{formatDateTime(b.createdAt)}</dd>
              </dl>
              <StatusBadge map={BOOKING_STATUS} status={b.status} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={view.page} totalPages={view.totalPages} total={view.total} onChange={view.setPage} />
    </>
  );
}
