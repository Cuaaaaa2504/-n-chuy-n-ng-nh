import { useMemo, useState } from 'react';

export default function useTableView(rows, { pageSize = 20, defaultSort = null } = {}) {
  const [sort, setSort] = useState(defaultSort); // { key, dir: 'asc' | 'desc' }
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), 'vi');
    });
    return sort.dir === 'desc' ? copy.reverse() : copy;
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const toggleSort = (key) =>
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  return { rows: pageRows, sort, toggleSort, page: safePage, totalPages, setPage, total: sorted.length };
}
