/**
 * Hằng số cấu hình rate-limiting (throttle) dùng chung toàn app.
 *
 * LƯU Ý QUAN TRỌNG VỀ ĐƠN VỊ:
 * Dự án dùng `@nestjs/throttler` v6 (xem package.json), từ v5 trở đi `ttl`
 * được tính bằng MILLI-GIÂY, không phải giây như v4 về trước.
 * => 60_000 ms = 60 giây.
 *
 * Nếu khai báo THROTTLE_TTL / THROTTLE_LIMIT trong file .env thì cũng phải
 * ghi theo ms, ví dụ:
 *   THROTTLE_TTL=60000
 *   THROTTLE_LIMIT=100
 */

/** Cửa sổ thời gian mặc định: 60 giây. */
export const THROTTLE_TTL = 60_000;

/**
 * Số request tối đa mặc định trong 1 cửa sổ TTL cho TOÀN app.
 * Đây chỉ là "lưới an toàn" nới rộng — các route nhạy cảm tự siết chặt hơn
 * bằng decorator @Throttle() ở controller (xem các hằng số bên dưới).
 */
export const THROTTLE_LIMIT = 100;

/**
 * Kiểu dữ liệu decorator `@Throttle()` của throttler v5+ yêu cầu:
 * một object map theo TÊN throttler. Vì ThrottlerModule.forRootAsync() trong
 * app.module.ts khai báo đúng 1 config và không đặt `name`, throttler sẽ tự
 * gán tên là 'default' — nên key ở đây bắt buộc phải là `default` thì phần
 * override mới ăn.
 */
type ThrottleOverride = Record<string, { limit: number; ttl: number }>;

/**
 * Endpoint xác thực công khai: /auth/register, /auth/login.
 * 5 lần / 60s — chống spam tạo tài khoản ảo và brute-force mật khẩu.
 */
export const AUTH_THROTTLE: ThrottleOverride = {
  default: { limit: 5, ttl: THROTTLE_TTL },
};

/**
 * Endpoint /auth/refresh — FE gọi tự động khi access token hết hạn
 * (silent refresh). User mở nhiều tab sẽ bắn nhiều request gần như đồng thời,
 * nên phải NỚI ra để tránh 429 oan làm user bị đăng xuất ngoài ý muốn.
 * 30 lần / 60s.
 */
export const REFRESH_THROTTLE: ThrottleOverride = {
  default: { limit: 30, ttl: THROTTLE_TTL },
};

/**
 * Endpoint nhạy cảm đã đăng nhập: đổi mật khẩu, gửi OTP...
 * 3 lần / 60s — chặt hơn cả login, vì attacker cầm token bị lộ có thể dò
 * `currentPassword`, và mỗi lần gửi OTP đều tốn SMS/email (dễ bị DoS ví).
 */
export const SENSITIVE_THROTTLE: ThrottleOverride = {
  default: { limit: 3, ttl: THROTTLE_TTL },
};

/**
 * Endpoint /otp/verify — 5 lần / 60s.
 * Mã OTP chỉ có 6 chữ số (1 triệu khả năng), không siết thì brute-force được.
 */
export const OTP_VERIFY_THROTTLE: ThrottleOverride = {
  default: { limit: 5, ttl: THROTTLE_TTL },
};
