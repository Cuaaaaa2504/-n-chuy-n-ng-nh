/**
 * Backend trả `avatarUrl` dạng path tương đối (vd: `/uploads/avatars/abc.png`).
 * Frontend chạy ở port khác nên nếu gán thẳng vào <img src> thì browser sẽ trỏ về
 * origin của frontend (localhost:5173) -> ảnh 404.
 *
 * Hàm này ghép thêm base URL của backend, đồng thời bỏ qua các URL đã đầy đủ
 * (http/https) và URL tạm của trình duyệt (blob:/data:) dùng cho preview.
 */
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';

  if (/^(https?:|blob:|data:)/i.test(path)) return path;

  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export default resolveAssetUrl;
