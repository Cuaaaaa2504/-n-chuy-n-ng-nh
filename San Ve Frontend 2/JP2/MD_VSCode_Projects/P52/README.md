# P52 – Service chọn ghế & booking

Đã bổ sung:
- `vite.config.js`.
- UI demo chọn ghế thật trong `App.jsx`.
- Dùng `axios` thống nhất thay vì `fetch`.
- Thêm `releaseSeats` để nhả ghế khi rời trang/hết hạn.
- Đếm ngược giữ ghế 5 phút phía client.
- Polling sơ đồ ghế mỗi 10 giây.

Chạy:
```bash
npm install
copy .env.example .env
npm run dev
```
