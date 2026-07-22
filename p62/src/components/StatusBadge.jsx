import { resolveStatus } from '../utils/status';

export default function StatusBadge({ map, status }) {
  const { label, className } = resolveStatus(map, status);
  return <span className={className}>{label}</span>;
}
