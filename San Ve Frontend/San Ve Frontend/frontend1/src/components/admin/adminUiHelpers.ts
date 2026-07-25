// src/components/admin/adminUiHelpers.ts
// Các hàm/hằng dùng chung cho /admin. Tách khỏi AdminUI.tsx để React Fast Refresh
// hoạt động đúng (file chứa component chỉ nên export component).
import { useCallback, useState } from 'react';

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

// ── Input trong form ───────────────────────────────────────────────────────
export const inputClass =
  'w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

// ── Format ─────────────────────────────────────────────────────────────────
export const formatVnd = (n: number) =>
  `${Number(n ?? 0).toLocaleString('vi-VN')} ₫`;

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';
