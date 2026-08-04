
import axiosClient from './axiosClient';

export interface AppNotification {
  notificationId: string;
  userId: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  referenceType?: string | null;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_TYPES = [
  'BOOKING',
  'PAYMENT',
  'TICKET',
  'TICKET_WATCH',
  'PROMOTION',
  'SYSTEM',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  BOOKING: '🎫',
  PAYMENT: '💳',
  TICKET: '🎟️',
  TICKET_WATCH: '👀',
  PROMOTION: '🎁',
  SYSTEM: '⚙️',
};

function normalize(item: Record<string, unknown>): AppNotification {
  return {
    ...(item as unknown as AppNotification),
    notificationId: String(
      item.notificationId ?? item.notification_id ?? item.id ?? '',
    ),
    title: String(item.title ?? 'Thông báo'),
    message: String(item.message ?? ''),
    notificationType: (item.notificationType ??
      item.notification_type ??
      'SYSTEM') as NotificationType,
    isRead: Boolean(item.isRead ?? item.is_read ?? false),
    createdAt: String(item.createdAt ?? item.created_at ?? ''),
  };
}

export async function getMyNotifications(): Promise<AppNotification[]> {
  try {
    const payload = (await axiosClient.get('/notifications')) as unknown as
      | Record<string, unknown>
      | unknown[];
    const rows = Array.isArray(payload)
      ? payload
      : (((payload as Record<string, unknown>).data as unknown[]) ?? []);
    return (rows as Record<string, unknown>[]).map(normalize);
  } catch {
    return [];
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const data = (await axiosClient.get(
      '/notifications/unread-count',
    )) as unknown as number | Record<string, unknown>;
    if (typeof data === 'number') return data;
    return Number(data?.count ?? data?.unread ?? data?.unreadCount ?? 0);
  } catch {
    return 0;
  }
}

export async function markAsRead(id: string): Promise<void> {
  await axiosClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await axiosClient.patch('/notifications/read-all');
}

export async function pushNotification(payload: {
  userId: number;
  title: string;
  message: string;
  notificationType?: NotificationType;
}): Promise<AppNotification> {
  const data = (await axiosClient.post(
    '/notifications/admin/push',
    payload,
  )) as unknown as Record<string, unknown>;
  return normalize(data);
}

export default {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  pushNotification,
};
