# P42 – Routing / Layout / API config

Đã bổ sung:
- `vite.config.js` đăng ký `@vitejs/plugin-react`.
- Navbar đổi trạng thái đăng nhập/đăng xuất theo `localStorage`.
- `PrivateRoute` bảo vệ `/booking/:movieId`, `/payment/:orderId`, `/my-tickets`.
- `axiosClient` tự gắn token và xử lý riêng lỗi `401` để logout.
- `MovieDetailPage` có nút **Đặt vé** dẫn sang luồng chọn ghế.

Chạy:
```bash
npm install
copy .env.example .env
npm run dev
```
