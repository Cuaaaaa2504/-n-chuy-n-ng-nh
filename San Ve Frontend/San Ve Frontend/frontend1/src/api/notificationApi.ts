// src/api/notificationApi.ts
//
// FIX [mục 3.1 → 3.5 của báo cáo] — file này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// Backend có đủ 5 endpoint và `NotificationService` vẫn đang tạo thông báo mỗi
// khi đặt vé / hoàn tiền. Nhưng không có `notificationApi.ts`, không có chuông
// trên navbar, không có form gửi thông báo trong admin. Toàn bộ dữ liệu sinh ra
// rồi nằm chết trong bảng `notifications`, không ai đọc được.
//
// LƯU Ý về thứ tự route ở backend (đã kiểm tra, KHÔNG phải lỗi):
// `@Patch(':id/read')` được khai báo TRƯỚC `@Patch('read-all')`. Nhìn qua thì
// giống bug định tuyến, nhưng hai path có số segment khác nhau ('read-all' là 1
// segment, ':id/read' là 2) nên NestJS không match nhầm. Không cần sửa.

import axiosClient from './axiosClient';

/** Khớp CHÍNH XÁC với `notification.entity.ts` — cột là `message` và
 *  `notification_type`, KHÔNG phải `content`/`type`. Đặt sai tên field ở đây
 *  sẽ khiến UI hiện thông báo rỗng mà không báo lỗi gì. */
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

/** Đúng danh sách @IsIn của CreateNotificationDto ở backend. */
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
    // notification_id là BIGINT -> TypeORM trả string. Giữ nguyên chuỗi,
    // KHÔNG ép Number (mất chính xác khi vượt 2^53-1).
    notificationId: String(
      item.notificationId ?? item.notification_id ?? item.id ?? '',
    ),
    title: String(item.title ?? 'Thông báo'),
    message: String(item.message ?? ''),
    notificationType: (item.notificationType ??
      item.notification_type ??
      'SYSTEM') as NotificationType,
    // Backend có thể trả 0/1 (BIT của SQL Server) thay vì true/false.
    isRead: Boolean(item.isRead ?? item.is_read ?? false),
    createdAt: String(item.createdAt ?? item.created_at ?? ''),
  };
}

/** GET /notifications — danh sách thông báo của user hiện tại. */
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
    // Thông báo là tính năng phụ trên navbar — lỗi API không được phép làm vỡ
    // toàn bộ layout của mọi trang.
    return [];
  }
}

/** GET /notifications/unread-count — số badge đỏ trên icon chuông. */
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

/** PATCH /notifications/:id/read */
export async function markAsRead(id: string): Promise<void> {
  await axiosClient.patch(`/notifications/${id}/read`);
}

/** PATCH /notifications/read-all */
export async function markAllAsRead(): Promise<void> {
  await axiosClient.patch('/notifications/read-all');
}

/** POST /notifications/admin/push — ADMIN gửi thông báo tới user. */
export async function pushNotification(payload: {
  userId: number;
  title: string;
  /** map vào cột `message` — DTO backend đặt tên field là `message` */
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
