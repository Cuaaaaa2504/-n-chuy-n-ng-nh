import { useMemo, useState } from 'react';
import useBookings from '../hooks/useBookings';
import useDebouncedValue from '../hooks/useDebouncedValue';
import BookingFilters from '../components/BookingFilters';
import BookingTable from '../components/BookingTable';
import { LoadingState, ErrorState } from '../components/DataState';

export default function AdminBookingsPage() {
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' });

  // Debounce: không gọi API mỗi ký tự khi nối backend thật.
  const debouncedKeyword = useDebouncedValue(keyword, 400);

  const queryParams = useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      status: filters.status || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
    }),
    [debouncedKeyword, filters]
  );

  const { bookings, loading, error, refetch } = useBookings(queryParams);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Quản lý đơn đặt vé</h1>
      </header>

      {/* Form lọc nằm NGOÀI nhánh loading -> không bị unmount -> input giữ focus */}
      <BookingFilters
        keyword={keyword}
        onKeywordChange={setKeyword}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="admin-page__content" aria-busy={loading}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <BookingTable bookings={bookings} />
        )}
      </div>
    </section>
  );
}
