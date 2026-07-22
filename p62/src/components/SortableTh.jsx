export default function SortableTh({ label, sortKey, sort, onSort }) {
  const active = sort?.key === sortKey;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" className="th-sort" onClick={() => onSort(sortKey)}>
        {label} <span aria-hidden="true">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}
