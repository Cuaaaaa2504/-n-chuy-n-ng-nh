# P55 – Thanh toán giả lập

Đã bổ sung:
- `vite.config.js`.
- Route `/payment/:orderId` để refresh trang không mất đơn hàng.
- Lấy phương thức thanh toán từ API, có fallback demo.
- Trang vé và chi tiết vé gọi API, hiển thị QR fallback.
- Điều hướng sau thanh toán về chi tiết vé hoặc danh sách vé.

Chạy:
```bash
npm install
copy .env.example .env
npm run dev
```
