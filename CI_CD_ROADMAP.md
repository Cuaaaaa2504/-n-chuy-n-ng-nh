# Lộ trình CI/CD cho CineHunt

## Mục tiêu

Xây dựng quy trình CI/CD tự động cho hệ thống CineHunt gồm:

- Backend NestJS: `San Ve Backend3/cinehunt-backend`
- Frontend React: `San Ve Frontend/San Ve Frontend/frontend1`
- Recommendation service Python: `recommendation-service`
- SQL Server database

Hiện tại repository đã có CI tại `.github/workflows/ci.yml`, bao gồm build, lint, test backend/frontend, kiểm tra secrets SQL integration, chạy migration và smoke test recommendation service.

Phần còn thiếu là **CD (Continuous Deployment)**: sau khi CI thành công, hệ thống cần tự động build Docker image, đẩy image lên registry và deploy lên môi trường chạy thật.

## Giai đoạn 1: Chuẩn hóa cấu hình môi trường

### Mục tiêu

Tách cấu hình nhạy cảm và cấu hình theo môi trường khỏi mã nguồn.

### Công việc

- Tạo `.env.example` cho backend, frontend và recommendation-service.
- Kiểm tra `.gitignore` đã loại bỏ `.env`, `.env.local`, `.env.production` và các file chứa secret.
- Liệt kê các biến môi trường cần thiết cho từng service.
- Đảm bảo backend đọc cấu hình database, JWT, port và các service bên ngoài từ biến môi trường.
- Đảm bảo frontend không chứa URL backend hard-code; dùng biến môi trường như `VITE_API_URL`.

### Biến môi trường gợi ý

Backend:

```env
DB_HOST=
DB_PORT=1433
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=
PORT=3000
```

Frontend:

```env
VITE_API_URL=https://api.ten-mien-cua-ban.com
```

Recommendation service:

```env
PORT=8000
```

### Kết quả cần đạt

- Không có secret thật trong repository.
- Mỗi service có thể chạy với cấu hình riêng cho dev, staging và production.
- Các cấu hình quan trọng được lưu dưới dạng GitHub Secrets hoặc biến môi trường trên server.

## Giai đoạn 2: Docker hóa các service

### Mục tiêu

Đóng gói backend, frontend và recommendation service thành Docker image để deploy nhất quán.

### Công việc

Tạo các file sau:

```text
San Ve Backend3/cinehunt-backend/Dockerfile
San Ve Backend3/cinehunt-backend/.dockerignore

San Ve Frontend/San Ve Frontend/frontend1/Dockerfile
San Ve Frontend/San Ve Frontend/frontend1/.dockerignore

recommendation-service/Dockerfile
recommendation-service/.dockerignore

docker-compose.yml
docker-compose.prod.yml
```

### Backend NestJS

Backend nên dùng multi-stage build:

- Stage build: cài dependency, build NestJS.
- Stage production: chỉ copy `node_modules` production và thư mục `dist`.
- Chạy bằng user không phải root nếu có thể.
- Mở port qua biến `PORT`.

### Frontend React

Frontend nên build thành static files rồi serve bằng Nginx.

- Stage build: cài dependency và chạy `npm run build`.
- Stage production: dùng image Nginx và copy thư mục `dist` hoặc `build` vào Nginx.
- Cấu hình Nginx proxy các request `/api` tới backend nếu frontend và backend chạy cùng domain.

### Recommendation service

Recommendation service nên dùng image Python nhẹ.

- Cài dependency từ `requirements.txt`.
- Copy mã nguồn và chạy service bằng lệnh phù hợp, ví dụ `uvicorn` hoặc script khởi động hiện có.
- Không copy notebook, dataset lớn hoặc file không cần thiết vào image.

### Kết quả cần đạt

- Có thể chạy toàn bộ hệ thống bằng Docker Compose trên máy local.
- Backend, frontend và recommendation service giao tiếp được với nhau.
- Image không chứa `.env`, node_modules không cần thiết hoặc file build tạm.

## Giai đoạn 3: Tách CI và CD

### Mục tiêu

Giữ CI hiện tại để kiểm tra chất lượng mã nguồn, đồng thời thêm workflow CD riêng cho deployment.

### CI hiện tại

Giữ `.github/workflows/ci.yml` cho:

- Push lên nhánh `main`.
- Mọi pull request.
- Build, lint và test backend.
- Build, lint và test frontend.
- Compile và smoke test recommendation service.
- Kiểm tra secrets SQL integration.
- Chạy migration và integration test SQL.

### CD mới

Tạo `.github/workflows/cd.yml` với điều kiện chạy:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

CD chỉ nên chạy sau khi CI thành công. Có thể dùng:

```yaml
needs: ci
```

hoặc gọi lại các bước build/test cần thiết trong workflow CD.

### Kết quả cần đạt

- Pull request chỉ chạy CI.
- Merge hoặc push lên `main` chạy CI rồi CD.
- Deploy có thể chạy lại thủ công bằng `workflow_dispatch` khi cần.

## Giai đoạn 4: Build và push Docker image

### Mục tiêu

Tự động build và lưu Docker image mỗi lần code trên `main` thay đổi.

### Công việc

- Tạo GitHub Container Registry repository cho backend, frontend và recommendation service.
- Dùng `docker/build-push-action` để build và push image.
- Gắn tag image theo commit SHA và `latest`.
- Chỉ push image khi CI thành công.

### Ví dụ tag image

```text
ghcr.io/cuaaaaa2504/cinehunt-backend:<commit-sha>
ghcr.io/cuaaaaa2504/cinehunt-backend:latest

ghcr.io/cuaaaaa2504/cinehunt-frontend:<commit-sha>
ghcr.io/cuaaaaa2504/cinehunt-frontend:latest

ghcr.io/cuaaaaa2504/cinehunt-recommendation:<commit-sha>
ghcr.io/cuaaaaa2504/cinehunt-recommendation:latest
```

### GitHub Secrets cần tạo

```text
GHCR_USERNAME
GHCR_TOKEN
```

Nếu dùng GitHub Actions với quyền `packages: write`, có thể dùng `GITHUB_TOKEN` thay vì tạo personal access token riêng.

### Kết quả cần đạt

- Mỗi lần merge vào `main` tạo ra image mới có version rõ ràng.
- Có thể rollback về image của commit trước nếu deploy gặp lỗi.

## Giai đoạn 5: Chọn môi trường deploy

### Phương án A: VPS + Docker Compose

Phù hợp nếu muốn kiểm soát server, chạy SQL Server và các service trên cùng một VPS.

Cần chuẩn bị:

- Một VPS Ubuntu, tối thiểu 2 vCPU và 4 GB RAM.
- Docker và Docker Compose.
- Domain hoặc IP public.
- Nginx hoặc Caddy làm reverse proxy.
- SSL certificate qua Let's Encrypt.
- SSH key để GitHub Actions đăng nhập server.

Quy trình deploy:

```text
GitHub Actions build image
        ↓
Push image lên GHCR
        ↓
SSH vào VPS
        ↓
Pull image mới
        ↓
docker compose up -d
        ↓
Chạy migration
        ↓
Health check
```

### Phương án B: Render + Vercel

Phù hợp nếu muốn triển khai nhanh và ít quản trị server.

- Backend NestJS deploy lên Render.
- Recommendation service deploy lên Render.
- Frontend React deploy lên Vercel.
- SQL Server dùng dịch vụ database cloud hoặc server SQL Server có IP public.

### Phương án C: Railway + Vercel

Tương tự Render, phù hợp cho demo đồ án.

- Backend và recommendation service deploy lên Railway.
- Frontend deploy lên Vercel.
- Database SQL Server cần được host ở nơi có thể truy cập từ Internet.

### Đề xuất

Nếu đã có VPS, chọn **Phương án A** vì có thể deploy cả backend, frontend, recommendation service và SQL Server trong một hệ thống Docker Compose.

Nếu chưa có VPS và muốn demo nhanh, chọn **Phương án B hoặc C**.

## Giai đoạn 6: Tự động deploy lên server

### Mục tiêu

GitHub Actions tự động cập nhật phiên bản mới trên server sau khi CI thành công.

### Công việc

Tạo các GitHub Secrets:

```text
SSH_HOST
SSH_USER
SSH_PRIVATE_KEY
DEPLOY_PATH
```

Tạo script deploy trên server, ví dụ `deploy.sh`:

```bash
#!/bin/bash
set -e

cd "$DEPLOY_PATH"

docker compose pull
docker compose up -d
docker image prune -f
```

Workflow CD sẽ SSH vào server và chạy script này.

### Lưu ý bảo mật

- Dùng SSH key riêng cho GitHub Actions, không dùng password.
- Giới hạn key này chỉ cho user deploy trên server.
- Không log private key hoặc password.
- Chỉ cho phép deploy từ nhánh `main`.

### Kết quả cần đạt

- Sau khi merge vào `main`, server tự động nhận phiên bản mới.
- Không cần đăng nhập server thủ công để deploy.
- Có thể xem log deploy trực tiếp trên tab Actions của GitHub.

## Giai đoạn 7: Migration và dữ liệu production

### Mục tiêu

Cập nhật database an toàn khi có thay đổi cấu trúc hoặc dữ liệu.

### Công việc

- Chạy migration sau khi container backend mới đã được deploy.
- Backup SQL Server trước mỗi lần deploy có migration.
- Không xóa hoặc reset database production trong pipeline.
- Kiểm tra migration có thể rollback hoặc có kế hoạch khôi phục khi lỗi.
- Lưu connection string và password database trong GitHub Secrets hoặc secret manager của server.

### Quy trình an toàn

```text
Backup database
        ↓
Pull image backend mới
        ↓
Chạy migration
        ↓
Khởi động lại backend
        ↓
Kiểm tra health check
```

### Kết quả cần đạt

- Database production không bị mất dữ liệu khi deploy.
- Lỗi migration được phát hiện trước khi người dùng sử dụng phiên bản mới.

## Giai đoạn 8: Health check và rollback

### Mục tiêu

Đảm bảo phiên bản mới hoạt động trước khi kết thúc pipeline.

### Công việc

Thêm endpoint health check cho backend, ví dụ:

```text
GET /health
```

Endpoint nên trả về HTTP 200 khi:

- Backend đang chạy.
- Kết nối database ổn định.
- Các dependency bắt buộc sẵn sàng.

Trong CD, sau khi deploy cần kiểm tra:

```bash
curl -f http://localhost:3000/health
```

### Rollback

Nếu health check thất bại:

- Không xóa image cũ.
- Lưu tag image của bản deploy trước.
- Cho phép rollback bằng cách chạy lại image cũ.

Ví dụ:

```bash
docker compose pull
docker compose up -d
```

Có thể thêm workflow `rollback.yml` để chọn tag image cũ và deploy lại.

### Kết quả cần đạt

- Deploy lỗi được phát hiện ngay.
- Có thể quay lại phiên bản ổn định trước đó nhanh chóng.

## Giai đoạn 9: Monitoring và log

### Mục tiêu

Theo dõi trạng thái hệ thống sau khi deploy.

### Công việc

- Xem log Docker Compose bằng `docker compose logs -f`.
- Kiểm tra trạng thái container bằng `docker compose ps`.
- Theo dõi CPU, RAM, disk và network của VPS.
- Cấu hình cảnh báo khi container restart liên tục hoặc health check thất bại.
- Lưu log backend và recommendation service ra file hoặc dịch vụ log nếu cần.

### Kết quả cần đạt

- Có thể biết service nào đang lỗi nhanh chóng.
- Có thể truy vết lỗi từ log deploy và log runtime.

## Giai đoạn 10: Hoàn thiện quy trình làm việc

### Quy trình đề xuất

```text
Tạo branch mới
        ↓
Phát triển feature
        ↓
Tạo Pull Request
        ↓
CI chạy build, lint, test
        ↓
Review và merge vào main
        ↓
CI chạy lại trên main
        ↓
CD build và push Docker image
        ↓
CD deploy lên server
        ↓
Health check và rollback nếu lỗi
```

### Quy ước nhánh

```text
main: nhánh production
 develop: nhánh tích hợp, tùy chọn
 feature/ten-chuc-nang: phát triển tính năng
 fix/ten-loi: sửa lỗi
 chore/cau-hinh: cấu hình, Docker, CI/CD
```

### Commit message gợi ý

```text
feat: thêm chức năng giữ ghế
fix: sửa lỗi thanh toán
chore: thêm Dockerfile cho backend
ci: thêm workflow CD
docs: thêm lộ trình CI/CD
```

## Danh sách file cần tạo

```text
.env.example

San Ve Backend3/cinehunt-backend/Dockerfile
San Ve Backend3/cinehunt-backend/.dockerignore

San Ve Frontend/San Ve Frontend/frontend1/Dockerfile
San Ve Frontend/San Ve Frontend/frontend1/.dockerignore

recommendation-service/Dockerfile
recommendation-service/.dockerignore

docker-compose.yml
docker-compose.prod.yml
deploy.sh

.github/workflows/ci.yml
.github/workflows/cd.yml
.github/workflows/rollback.yml
```

## Thứ tự thực hiện

1. Tạo `.env.example` và kiểm tra `.gitignore`.
2. Viết Dockerfile cho backend, frontend và recommendation service.
3. Tạo `docker-compose.yml` và chạy thử toàn bộ hệ thống local.
4. Tạo `docker-compose.prod.yml` cho môi trường production.
5. Tạo workflow `cd.yml` để build và push Docker image.
6. Chuẩn bị VPS hoặc Render/Railway.
7. Thêm secrets deploy vào GitHub.
8. Thêm bước SSH deploy hoặc deploy qua API của Render/Railway.
9. Thêm migration production và backup database.
10. Thêm health check, rollback và monitoring.

## Tiêu chí hoàn thành

CI/CD được xem là hoàn thành khi:

- Mọi pull request đều được kiểm tra tự động.
- Merge vào `main` tự động build Docker image.
- Image được đẩy lên registry với tag rõ ràng.
- Server hoặc nền tảng cloud tự động nhận phiên bản mới.
- Database migration chạy an toàn và có backup.
- Health check xác nhận hệ thống hoạt động.
- Có thể rollback khi deploy lỗi.
- Không có secret nào bị commit vào repository.
