import axiosClient from './axiosClient';
import type {
  AdminBooking,
  AdminBookingFilters,
  AdminRefund,
  AuditLog,
  Cinema,
  ConcessionCombo,
  CreateVoucherPayload,
  DashboardStats,
  Paginated,
  Product,
  RevenueGroupBy,
  RevenueReport,
  Room,
  UpdateVoucherPayload,
  Voucher,
  VoucherPage,
} from '../types/admin';

/**
 * axiosClient interceptor đã unwrap response.data một lần.
 * Helper `get/post/patch/del` chỉ để ép kiểu cho gọn, KHÔNG unwrap thêm.
 */
const get = <T>(url: string, params?: Record<string, unknown>) =>
  axiosClient.get(url, { params }) as unknown as Promise<T>;
const post = <T>(url: string, body?: unknown) =>
  axiosClient.post(url, body) as unknown as Promise<T>;
const patch = <T>(url: string, body?: unknown) =>
  axiosClient.patch(url, body) as unknown as Promise<T>;
const del = <T>(url: string) => axiosClient.delete(url) as unknown as Promise<T>;

// ── Dashboard & báo cáo ────────────────────────────────────────────────────
export const statsApi = {
  /** GET /admin/stats */
  getStats: () => get<DashboardStats>('/admin/stats'),

  /** GET /admin/reports/revenue */
  getRevenueReport: (params: {
    groupBy?: RevenueGroupBy;
    fromDate?: string;
    toDate?: string;
  }) => get<RevenueReport>('/admin/reports/revenue', params),
};

// ── Đơn đặt vé ─────────────────────────────────────────────────────────────
export const adminBookingApi = {
  /** GET /bookings/admin/all */
  getAll: (filters: AdminBookingFilters = {}) => {
    // Bỏ field rỗng để backend ValidationPipe không báo lỗi
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    );
    return get<Paginated<AdminBooking>>('/bookings/admin/all', params);
  },

  /** GET /bookings/admin/:id */
  getDetail: (id: string | number) => get<unknown>(`/bookings/admin/${id}`),

  /** PATCH /bookings/admin/:id/status */
  updateStatus: (id: string | number, status: string) =>
    patch<AdminBooking>(`/bookings/admin/${id}/status`, { status }),
};

// ── Voucher ────────────────────────────────────────────────────────────────
export const voucherApi = {
  getAll: (page = 1, limit = 20) => get<VoucherPage>('/vouchers', { page, limit }),
  create: (payload: CreateVoucherPayload) => post<Voucher>('/vouchers', payload),
  update: (id: number, payload: UpdateVoucherPayload) =>
    patch<Voucher>(`/vouchers/${id}`, payload),
  toggle: (id: number) => patch<Voucher>(`/vouchers/${id}/toggle`),
  remove: (id: number) => del<{ success: boolean; message: string }>(`/vouchers/${id}`),
};

// ── Rạp & phòng chiếu ──────────────────────────────────────────────────────
export const cinemaApi = {
  getAll: () => get<Cinema[]>('/cinemas'),
  create: (payload: Partial<Cinema>) => post<Cinema>('/cinemas', payload),
  update: (id: number, payload: Partial<Cinema>) =>
    patch<Cinema>(`/cinemas/${id}`, payload),
  remove: (id: number) => del<{ message: string }>(`/cinemas/${id}`),

  getRooms: (cinemaId: number) => get<Room[]>(`/cinemas/${cinemaId}/rooms/all`),
  createRoom: (cinemaId: number, payload: Partial<Room>) =>
    post<Room>(`/cinemas/${cinemaId}/rooms`, payload),
  updateRoom: (cinemaId: number, roomId: number, payload: Partial<Room>) =>
    patch<Room>(`/cinemas/${cinemaId}/rooms/${roomId}`, payload),
  removeRoom: (cinemaId: number, roomId: number) =>
    del<{ success: boolean }>(`/cinemas/${cinemaId}/rooms/${roomId}`),
};

// ── Sản phẩm & combo ───────────────────────────────────────────────────────
export const productApi = {
  getAll: () => get<Product[]>('/products/admin/all'),
  create: (payload: Partial<Product>) => post<Product>('/products', payload),
  update: (id: number, payload: Partial<Product>) =>
    patch<Product>(`/products/${id}`, payload),
  remove: (id: number) => del<void>(`/products/${id}`),
};

export const comboApi = {
  getAll: () => get<ConcessionCombo[]>('/concession-combos/admin/all'),
  create: (payload: Partial<ConcessionCombo>) =>
    post<ConcessionCombo>('/concession-combos', payload),
  update: (id: number, payload: Partial<ConcessionCombo>) =>
    patch<ConcessionCombo>(`/concession-combos/${id}`, payload),
  remove: (id: number) => del<void>(`/concession-combos/${id}`),
};

// ── Hoàn tiền ──────────────────────────────────────────────────────────────
export const refundApi = {
  getAll: (params: { status?: string; page?: number; limit?: number } = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    return get<Paginated<AdminRefund>>('/refunds/admin/all', clean);
  },
  approve: (id: string, providerRef?: string) =>
    patch<AdminRefund>(`/refunds/admin/${id}/approve`, { providerRef }),
  reject: (id: string, reason?: string) =>
    patch<AdminRefund>(`/refunds/admin/${id}/reject`, { reason }),
};

// ── Nhật ký hệ thống ───────────────────────────────────────────────────────
export const auditLogApi = {
  getAll: (page = 1, limit = 20) => get<AuditLog[]>('/audit-logs', { page, limit }),
  getByUser: (userId: number) => get<AuditLog[]>(`/audit-logs/user/${userId}`),
};

export default {
  statsApi,
  adminBookingApi,
  voucherApi,
  cinemaApi,
  productApi,
  comboApi,
  refundApi,
  auditLogApi,
};
