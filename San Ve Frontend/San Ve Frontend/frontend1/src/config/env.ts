// src/config/env.ts
//
// FIX Lỗi 1 & 4: base URL của backend trước đây được hardcode ở 3 nơi rời rạc
// (axiosClient.ts x2, assetUrl.ts) với giá trị fallback SAI là port 3002,
// trong khi `main.ts` của backend listen ở `process.env.PORT || 3000`.
// Không có file .env -> mọi request đều bắn vào cổng chết -> toàn bộ Admin Panel
// hỏng (dropdown phim trống, dashboard lỗi, refresh token cũng fail theo).
//
// Nay chỉ còn MỘT nguồn sự thật duy nhất. Muốn đổi port thì sửa .env, không
// phải đi tìm từng file.

/** Base URL của backend CineHunt. Ghi đè bằng VITE_API_BASE_URL trong .env */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export default API_BASE_URL;
