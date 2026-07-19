// src/types/admin.ts
// Kiểu dữ liệu dùng chung cho khu vực /admin

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalMovies: number;
  totalShowtimes: number;
  totalBookings: number;
  totalPaidBookings: number;
  totalRevenue: number;
  totalUsers: number;
  generatedAt?: string;
}

// ── Báo cáo doanh thu ──────────────────────────────────────────────────────
export type RevenueGroupBy = 'day' | 'month' | 'movie' | 'cinema';

export interface RevenueRow {
  label: string;
  refId: number | null;
  bookings: number;
  revenue: number;
}

export interface RevenueReport {
  groupBy: RevenueGroupBy;
  fromDate: string | null;
  toDate: string | null;
  items: RevenueRow[];
  totalBookings: number;
  totalRevenue: number;
}

// ── Đơn đặt vé (admin) ─────────────────────────────────────────────────────
export type AdminPaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';

export type AdminBookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface AdminBooking {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerEmail?: string | null;
  movieTitle: string;
  cinemaName?: string | null;
  roomName?: string | null;
  showtime: string | null;
  seats: string[];
  totalAmount: number;
  status: AdminBookingStatus;
  paymentStatus: AdminPaymentStatus;
  createdAt?: string;
}

export interface AdminBookingFilters {
  bookingCode?: string;
  customerName?: string;
  movieTitle?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

// ── Voucher ────────────────────────────────────────────────────────────────
export interface Voucher {
  promotionId: number;
  promotionCode: string;
  promotionName: string;
  discountType: 'PERCENT' | 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  description: string | null;
}

export interface VoucherPage {
  items: Voucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateVoucherPayload {
  code: string;
  promotionName: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  description?: string;
}

export type UpdateVoucherPayload = Partial<Omit<CreateVoucherPayload, 'code'>>;

// ── Rạp & phòng chiếu ──────────────────────────────────────────────────────
export interface Cinema {
  cinemaId: number;
  cinemaName: string;
  address: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Room {
  roomId: number;
  cinemaId: number;
  roomName: string;
  roomType: 'STANDARD' | 'VIP' | 'IMAX' | '4DX';
  totalSeats: number;
  status: 'ACTIVE' | 'INACTIVE';
}

// ── Sản phẩm & combo ───────────────────────────────────────────────────────
export interface Product {
  productId: number;
  productName: string;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ConcessionCombo {
  comboId: number;
  comboName: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

// ── Hoàn tiền ──────────────────────────────────────────────────────────────
export type RefundStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AdminRefund {
  refundId: string;
  bookingId: string;
  bookingCode: string | null;
  customerName: string | null;
  customerEmail: string | null;
  paymentId: string;
  refundAmount: number;
  reason: string | null;
  refundStatus: RefundStatus;
  requestedAt: string;
  completedAt: string | null;
}

// ── Nhật ký hệ thống ───────────────────────────────────────────────────────
export interface AuditLog {
  auditId: string;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  createdAt: string;
}
