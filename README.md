CineHunt - Hệ thống đặt vé xem phim

CineHunt là đồ án chuyên ngành xây dựng hệ thống đặt vé xem phim, gồm:

Frontend: React + TypeScript + Vite.

Backend: NestJS + TypeORM.

Cơ sở dữ liệu: Microsoft SQL Server.

Gợi ý phim: Python + FastAPI + mô hình Hybrid Recommendation.

1. Cấu trúc chính của dự án

-n-chuy-n-ng-nh/
├── CineHunt_Database_V6_3_With_Sample_Data.sql
├── San Ve Backend3/
│   └── cinehunt-backend/
├── San Ve Frontend/
│   └── San Ve Frontend/
│       └── frontend1/
└── recommendation-service/

Các đường dẫn có dấu cách nên cần đặt trong dấu "..." khi dùng lệnh cd.

2. Phần mềm cần cài đặt

Git.

Node.js 20 trở lên và npm.

Microsoft SQL Server đang hoạt động.

SQL Server Management Studio hoặc công cụ tương đương.

Python 3.10 - 3.12 nếu sử dụng chức năng gợi ý phim.

ODBC Driver 17/18 for SQL Server nếu recommendation service dùng pyodbc.

Kiểm tra nhanh:

git --version
node -v
npm -v
python3 --version

Trên Windows có thể dùng python thay cho python3.

3. Tải mã nguồn

git clone https://github.com/Cuaaaaa2504/-n-chuy-n-ng-nh.git
cd "-n-chuy-n-ng-nh"

Nếu đã tải dự án trước đó:

git pull origin main

4. Khởi tạo cơ sở dữ liệu SQL Server

Bước 1: Khởi động SQL Server

Bảo đảm SQL Server đang chạy và có thể kết nối bằng tài khoản được khai báo trong backend.

Thông số mặc định:

Host: localhost
Port: 1433
Database: CineHuntDB
Username: sa

Bước 2: Chạy file SQL

Mở và chạy toàn bộ file:

CineHunt_Database_V6_3_With_Sample_Data.sql

Trong đầu file có biến:

DECLARE @ResetDatabase BIT = 0;

Giữ 0 để không xóa database hiện có.

Đổi thành 1 khi muốn xóa CineHuntDB cũ và tạo lại từ đầu.

Cảnh báo: @ResetDatabase = 1 sẽ làm mất dữ liệu hiện có trong CineHuntDB.

5. Cấu hình và chạy Backend

Bước 1: Vào thư mục backend

cd "San Ve Backend3/cinehunt-backend"

Bước 2: Cài thư viện

npm install

Bước 3: Tạo file môi trường

macOS/Linux:

cp .env.example .env

Windows CMD:

copy .env.example .env

Cập nhật file .env:

NODE_ENV=development

DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=MAT_KHAU_SQL_SERVER
DB_DATABASE=CineHuntDB
DB_MIGRATIONS_RUN=true

PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

JWT_SECRET=CHUOI_BI_MAT_DAI_VA_NGAU_NHIEN
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=CHUOI_BI_MAT_KHAC
JWT_REFRESH_EXPIRES_IN=7d

RECOMMENDATION_SERVICE_URL=http://localhost:8000
RECOMMENDATION_TIMEOUT_MS=5000

Không commit file .env, mật khẩu, JWT secret hoặc API key lên GitHub.

Nếu dùng SQL Server Express theo named instance:

DB_INSTANCE=SQLEXPRESS

Bước 4: Chạy migration

Sau khi đã chạy file SQL chính:

npm run migration:run

Kiểm tra migration:

npm run migration:show

Bước 5: Chạy backend

npm run start:dev

Backend mặc định:

http://localhost:3000

Swagger API:

http://localhost:3000/api

Dừng backend bằng Ctrl + C.

6. Cấu hình Recommendation Service

Phần này dùng cho chức năng gợi ý phim cá nhân hóa.

Bước 1: Tạo môi trường Python

Mở terminal mới tại thư mục gốc repository:

cd recommendation-service
python3 -m venv .venv

Kích hoạt môi trường.

macOS/Linux:

source .venv/bin/activate

Windows CMD:

.venv\Scripts\activate

Windows PowerShell:

.venv\Scripts\Activate.ps1

Bước 2: Cài thư viện

pip install -r requirements.txt

Bước 3: Tạo file môi trường

macOS/Linux:

cp .env.example .env

Windows:

copy .env.example .env

Recommendation service có thể dùng chung các biến DB_* trong .env của backend. Nếu cần cấu hình riêng, khai báo kết nối database trong recommendation-service/.env.

Nếu pyodbc không kết nối được hoặc máy chưa có ODBC Driver:

DB_CONNECTOR=pymssql

Bước 4: Huấn luyện mô hình lần đầu

python train.py

Model được lưu tại:

recommendation-service/model/recommender.joblib

Bước 5: Khởi động service

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

Kiểm tra:

Health check: http://localhost:8000/health
API docs:     http://localhost:8000/docs

Sau khi train lại model trong lúc service đang chạy:

curl -X POST http://localhost:8000/reload

7. Chạy nhanh Backend và Recommendation Service

Sau khi đã cài đầy đủ npm package, Python package, tạo .env và khởi tạo database:

cd "San Ve Backend3/cinehunt-backend"
npm run start:stack

Lệnh này sẽ:

Chạy TypeORM migrations nếu DB_MIGRATIONS_RUN=true.

Tự train model nếu chưa có model và RECOMMENDATION_BOOTSTRAP_MODEL=true.

Khởi động recommendation service ở cổng 8000.

Khởi động NestJS backend ở cổng 3000.

start:stack không tự cài thư viện hoặc SQL Server. Máy vẫn phải được chuẩn bị trước.

8. Cấu hình và chạy Frontend

Mở terminal mới tại thư mục gốc repository:

cd "San Ve Frontend/San Ve Frontend/frontend1"

Cài thư viện:

npm install

Chạy frontend:

npm run dev

Địa chỉ mặc định:

http://localhost:5173

Frontend dùng proxy /api và mặc định chuyển request tới:

http://localhost:3000

Nếu backend chạy ở địa chỉ khác, tạo file .env trong thư mục frontend:

VITE_API_PROXY_TARGET=http://localhost:3000

Sau khi sửa .env, phải chạy lại npm run dev.

9. Thứ tự vận hành toàn hệ thống

Thứ tự khuyến nghị:

Khởi động SQL Server.

Chạy file SQL nếu database chưa được tạo.

Chạy backend và recommendation service bằng npm run start:stack.

Chạy frontend bằng npm run dev.

Mở http://localhost:5173.

Nếu không dùng recommendation service:

Khởi động SQL Server.

Chạy backend bằng npm run start:dev.

Chạy frontend bằng npm run dev.

Backend có cơ chế dự phòng khi recommendation service chưa hoạt động, nhưng chức năng gợi ý cá nhân hóa có thể không đầy đủ.

10. Kiểm tra hệ thống

Thành phần

Địa chỉ

Kết quả mong đợi

Frontend

http://localhost:5173

Hiển thị giao diện CineHunt

Backend

http://localhost:3000/api

Hiển thị Swagger UI

Recommendation

http://localhost:8000/health

Trả về trạng thái service/model

Recommendation docs

http://localhost:8000/docs

Hiển thị FastAPI Swagger

11. Build và chạy bản production cục bộ

Backend

cd "San Ve Backend3/cinehunt-backend"
npm install
npm run build
npm run start:prod

Frontend

cd "San Ve Frontend/San Ve Frontend/frontend1"
npm install
npm run build
npm run preview

npm run preview chỉ dùng để kiểm tra bản build cục bộ. Khi triển khai thật, nên phục vụ thư mục dist bằng web server hoặc nền tảng triển khai frontend.

12. Lỗi thường gặp

ENOENT: no such file or directory, open package.json

Terminal đang đứng sai thư mục.

Backend:

San Ve Backend3/cinehunt-backend

Frontend:

San Ve Frontend/San Ve Frontend/frontend1

Login failed for user 'sa'

Kiểm tra DB_USERNAME và DB_PASSWORD.

Kiểm tra SQL Server Authentication đã bật.

Kiểm tra tài khoản chưa bị khóa.

Failed to connect to localhost:1433

SQL Server chưa chạy.

TCP/IP chưa được bật.

Cổng SQL Server không phải 1433.

Firewall đang chặn kết nối.

DB_HOST, DB_PORT hoặc DB_INSTANCE bị sai.

Invalid object name ...

Chạy migration:

npm run migration:run

Nếu vẫn lỗi, chạy lại file SQL chính và kiểm tra đang dùng đúng CineHuntDB.

Frontend chạy nhưng không tải dữ liệu

Kiểm tra backend có chạy ở cổng 3000.

Mở http://localhost:3000/api.

Kiểm tra lỗi proxy trong terminal frontend.

Kiểm tra VITE_API_PROXY_TARGET.

Kiểm tra lỗi CORS trong Developer Tools.

Lỗi CORS

Trong backend .env:

CORS_ORIGINS=http://localhost:5173,http://localhost:3001

Sau đó khởi động lại backend.

EADDRINUSE: address already in use

Cổng 3000, 5173 hoặc 8000 đang được chương trình khác sử dụng. Dừng tiến trình cũ hoặc đổi cổng.

Can't open lib 'ODBC Driver ... for SQL Server'

Cài ODBC Driver 17/18 hoặc dùng:

DB_CONNECTOR=pymssql

Train xong nhưng model chưa được sử dụng

curl -X POST http://localhost:8000/reload

Hoặc khởi động lại recommendation service.

13. Các lệnh thường dùng

Backend

npm run start:dev       # Chạy development, tự reload
npm run start:stack     # Chạy backend + recommendation service
npm run build           # Build backend
npm run start:prod      # Chạy backend production
npm run migration:run   # Chạy migration
npm run migration:show  # Xem trạng thái migration

Frontend

npm run dev      # Chạy development
npm run build    # Build frontend
npm run preview  # Kiểm tra bản build
npm run lint     # Kiểm tra lint

Recommendation service

python train.py
python smoke_test.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

14. Lưu ý bảo mật

Không commit file .env.

Không đưa mật khẩu SQL Server, JWT secret hoặc API key lên GitHub.

Không dùng tài khoản sa và mật khẩu yếu khi triển khai production.

Chỉ mở cổng 8000 của recommendation service trong mạng nội bộ.

Thay toàn bộ secret mẫu trước khi đưa hệ thống lên máy chủ.
