// src/pages/admin/AdminNotificationsPage.tsx
//
// FIX [mục 3.5 của báo cáo] — trang này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// `POST /notifications/admin/push` có sẵn ở backend nhưng "không có form nào
// trong admin dashboard". Hệ quả: admin không có bất kỳ cách nào liên lạc với
// người dùng qua hệ thống thông báo, dù đây là tính năng cốt lõi của một hệ
// quản trị.
//
// Trang này cố tình giữ tối giản: chọn người nhận từ danh sách user có sẵn
// (tránh gõ tay userId sai và gửi nhầm người), soạn tiêu đề + nội dung, chọn
// loại thông báo trong đúng danh sách backend chấp nhận.

import { useEffect, useMemo, useState } from 'react';
import userApi from '../../api/userApi';
import {
  NOTIFICATION_ICON,
  NOTIFICATION_TYPES,
  pushNotification,
} from '../../api/notificationApi';
import type { NotificationType } from '../../api/notificationApi';
import type { User } from '../../types/user';
import {
  Btn,
  ErrorBanner,
  Field,
  PageHeader,
  Toast,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('SYSTEM');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    void userApi
      .getAll({ page: 1, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        // Backend phân trang trả { data, total, page, limit }; phòng trường hợp
        // trả mảng trần thì vẫn đọc được.
        const rows = Array.isArray(res) ? res : (res?.data ?? []);
        setUsers(rows as User[]);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được danh sách người dùng');
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.fullName ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const canSend = userId !== '' && title.trim() && message.trim() && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await pushNotification({
        userId: Number(userId),
        title: title.trim(),
        message: message.trim(),
        notificationType: type,
      });
      showToast('Đã gửi thông báo');
      setTitle('');
      setMessage('');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không gửi được thông báo');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="🔔 Gửi thông báo"
        subtitle="Gửi thông báo trực tiếp tới một người dùng cụ thể"
      />

      {error && <ErrorBanner message={error} />}

      <div className="max-w-2xl space-y-4">
        <Field label="Tìm người nhận">
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên hoặc email…"
          />
        </Field>

        <Field label="Người nhận">
          <select
            className={inputClass}
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">— Chọn người dùng —</option>
            {filtered.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.email}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Loại thông báo">
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as NotificationType)}
          >
            {/* Danh sách này phải khớp @IsIn của CreateNotificationDto, nếu
                không backend sẽ trả 400 mà UI không rõ vì sao. */}
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_ICON[t]} {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tiêu đề">
          <input
            className={inputClass}
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Suất chiếu của bạn đã đổi giờ"
          />
        </Field>

        <Field label="Nội dung">
          <textarea
            className={inputClass}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nội dung chi tiết gửi tới người dùng…"
          />
        </Field>

        <Btn variant="primary" onClick={() => void send()} disabled={!canSend}>
          {sending ? 'Đang gửi…' : '📨 Gửi thông báo'}
        </Btn>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
