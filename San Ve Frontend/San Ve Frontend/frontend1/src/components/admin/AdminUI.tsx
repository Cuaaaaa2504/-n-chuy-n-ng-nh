// src/components/admin/AdminUI.tsx
// Các mảnh UI dùng chung cho toàn bộ trang /admin (Tailwind, dark theme).
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

// ── Toast ──────────────────────────────────────────────────────────────────
export interface ToastState {
  msg: string;
  type: 'success' | 'error';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-6 right-6 z-[60] px-5 py-3 rounded-xl text-white font-semibold shadow-lg ${
        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {toast.msg}
    </div>
  );
}

// ── Header trang ───────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

// ── Trạng thái tải / rỗng / lỗi ────────────────────────────────────────────
export function Loading({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
      <span className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ icon = '📭', label }: { icon?: string; label: string }) {
  return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-4xl mb-3">{icon}</p>
      <p>{label}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
      {message}
    </div>
  );
}

// ── Khung bảng ─────────────────────────────────────────────────────────────
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="text-left px-5 py-4 whitespace-nowrap">{children}</th>;
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 ${className}`}>{children}</td>;
}

// ── Phân trang (FIX BUG-06) ────────────────────────────────────────────────
export function Pagination({
  page,
  limit,
  total,
  onChange,
  disabled = false,
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const btn =
    'px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 text-gray-300 hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-xs text-gray-500">
        Hiển thị {from}–{to} trên tổng {total.toLocaleString('vi-VN')}
      </p>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={() => onChange(1)} disabled={disabled || page <= 1}>
          « Đầu
        </button>
        <button className={btn} onClick={() => onChange(page - 1)} disabled={disabled || page <= 1}>
          ‹ Trước
        </button>
        <span className="text-xs text-gray-400 px-2">
          Trang {page} / {totalPages}
        </span>
        <button
          className={btn}
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Sau ›
        </button>
        <button
          className={btn}
          onClick={() => onChange(totalPages)}
          disabled={disabled || page >= totalPages}
        >
          Cuối »
        </button>
      </div>
    </div>
  );
}

// ── Nút ────────────────────────────────────────────────────────────────────
const BTN_VARIANTS: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  ghost: 'border border-gray-700 text-gray-300 hover:bg-gray-800',
  danger: 'bg-red-600/20 text-red-300 hover:bg-red-600/40 border border-red-600/30',
  success: 'bg-green-600/20 text-green-300 hover:bg-green-600/40 border border-green-600/30',
  purple: 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border border-purple-600/30',
};

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof BTN_VARIANTS;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${BTN_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Badge trạng thái ───────────────────────────────────────────────────────
const PILL_COLORS: Record<string, string> = {
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export function Pill({
  children,
  color = 'gray',
}: {
  children: ReactNode;
  color?: keyof typeof PILL_COLORS;
}) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${PILL_COLORS[color]}`}
    >
      {children}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Xác nhận',
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
        <p className="text-white mb-6 text-center">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input trong form ───────────────────────────────────────────────────────
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

// ── Format ─────────────────────────────────────────────────────────────────
export const formatVnd = (n: number) =>
  `${Number(n ?? 0).toLocaleString('vi-VN')} ₫`;

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';
