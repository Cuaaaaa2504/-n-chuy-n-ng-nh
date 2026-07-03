# P60 - Admin layout và route guard

Project React + TypeScript + Vite dùng để chạy issue #60 trong VS Code.

## Chức năng đã có

- Admin layout với sidebar và header.
- Nested routes cho `/admin`, `/admin/movies`, `/admin/showtimes`, `/admin/bookings`.
- Route guard:
  - Chưa đăng nhập: chuyển về `/login`.
  - Đăng nhập nhưng không phải `ADMIN`: chuyển về `/forbidden`.
  - `ADMIN`: được vào trang quản trị.
- Trang 403 Forbidden riêng.
- Trang 404 Not Found cho URL không hợp lệ, tránh lỗi trang trắng khi route không khớp.
- Helper auth dùng chung tại `src/utils/auth.ts`.
- Xử lý JSON lỗi trong localStorage bằng cách xóa dữ liệu lỗi.
- Đồng bộ trạng thái đăng nhập/đăng xuất bằng `storage` và `auth-changed` event.
- Nút đăng xuất trong AdminLayout.
- Nút demo ở các trang admin đã có `onClick` thông báo rõ phạm vi chưa nối API.

## Cách chạy

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thường là:

```txt
http://localhost:5173
```

## Cách test

### 1. Chưa đăng nhập

Truy cập:

```txt
/admin
```

Kết quả: bị chuyển về `/login`.

### 2. Đăng nhập USER

Ở `/login`, bấm **Đăng nhập User** rồi truy cập:

```txt
/admin
```

Kết quả: bị chuyển về `/forbidden`.

### 3. Đăng nhập ADMIN

Ở `/login`, bấm **Đăng nhập Admin** rồi truy cập:

```txt
/admin
/admin/movies
/admin/showtimes
/admin/bookings
```

Kết quả: truy cập được layout admin và các route con.

### 4. URL không tồn tại

Truy cập:

```txt
/abc
/admin/unknown
```

Kết quả: hiển thị trang `404 - Không tìm thấy trang`, không còn bị blank page.

## Lưu ý

Route guard hiện vẫn là demo phía client bằng `localStorage`. Khi ghép backend thật, cần thay bằng kiểm tra access token/JWT và gọi API `/auth/me` hoặc endpoint tương đương.

## Commit đề xuất

```bash
git add .
git commit -m "feat(admin): build admin layout and route guard - Closes #60"
```
