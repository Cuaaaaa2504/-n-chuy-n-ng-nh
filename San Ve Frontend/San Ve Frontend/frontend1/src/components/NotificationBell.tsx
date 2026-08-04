
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  NOTIFICATION_ICON,
} from '../api/notificationApi';
import type { AppNotification } from '../api/notificationApi';

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(t).toLocaleDateString('vi-VN');
}

export default function NotificationBell({ darkMode }: { darkMode: boolean }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refreshBadge = useCallback(async () => {
    setUnread(await getUnreadCount());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void getUnreadCount().then((n) => { if (!cancelled) setUnread(n); });
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const loadList = useCallback(() => {
    setLoading(true);
    return getMyNotifications()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleRead = async (n: AppNotification) => {
    if (n.isRead) return;
    setItems((prev) =>
      prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)),
    );
    setUnread((c) => Math.max(0, c - 1));
    try {
      await markAsRead(n.notificationId);
    } catch {
      void refreshBadge();
    }
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await markAllAsRead();
    } catch {
      void refreshBadge();
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void loadList();
        }}
        aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ''}`}
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition text-lg"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-xl shadow-xl border z-50 ${
            darkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          <div
            className={`flex items-center justify-between px-4 py-3 border-b sticky top-0 ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
            }`}
          >
            <span className="font-bold text-sm">Thông báo</span>
            {unread > 0 && (
              <button
                onClick={() => void handleReadAll()}
                className="text-xs font-semibold text-blue-500 hover:underline"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          {loading && (
            <p className={`px-4 py-6 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Đang tải…
            </p>
          )}

          {!loading && items.length === 0 && (
            <p className={`px-4 py-8 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Chưa có thông báo nào
            </p>
          )}

          {!loading &&
            items.map((n) => (
              <button
                key={n.notificationId}
                onClick={() => void handleRead(n)}
                className={`w-full text-left px-4 py-3 border-b transition ${
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-700'
                    : 'border-gray-100 hover:bg-blue-50'
                } ${n.isRead ? 'opacity-60' : ''}`}
              >
                <div className="flex gap-2">
                  <span className="shrink-0">
                    {NOTIFICATION_ICON[n.notificationType] ?? '🔔'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
