# CineHunt — Recommendation Service

Service Python (FastAPI) phục vụ gợi ý phim cá nhân hoá cho CineHunt.

Đây là bản production hoá của notebook
`movie_recommendation_v7_balanced_format_input_features_reviewed`.

---

## 1. Điều quan trọng nhất phải đọc trước

**Notebook v7 được huấn luyện trên MovieLens 1M, KHÔNG phải trên dữ liệu
CineHunt.** Không thể chạy notebook, export ra `.pkl` rồi đem dùng thẳng: cột
`UserID`/`MovieID` của MovieLens không có quan hệ gì với `user_id`/`movie_id`
trong `CineHuntDB`. Gợi ý sẽ trỏ vào những phim không tồn tại.

Ngoài ra, **CineHunt không có bảng rating**. Kiểm tra
`CineHunt_Database_V6_3_With_Sample_Data.sql`: 28 bảng, không có bảng nào lưu
điểm người dùng chấm cho phim.

Vì vậy service này giữ nguyên **thuật toán** của notebook nhưng **huấn luyện
lại trên dữ liệu thật của CineHunt**, dùng tín hiệu ngầm từ hành vi đặt vé:

| Notebook (MovieLens)          | Service này (CineHunt)                                  |
| ----------------------------- | ------------------------------------------------------- |
| `Rating` 1–5 người dùng chấm   | Suy ra từ số lần đặt vé: `3.5 + 0.5 × (số lần − 1)`, trần 5.0 |
| `ratings.dat`                 | `booking_orders` → `showtimes` → `movie_id`, chỉ đơn PAID/ISSUED |
| `Genres` từ `movies.dat`      | `movies` ⋈ `movie_genres` ⋈ `genres`                     |
| Popularity + Content + SVD + NCF + Hybrid | Popularity + Content + SVD + Hybrid (bỏ NCF)  |

**Vì sao bỏ Neural CF:** nó kéo theo TensorFlow (~600 MB), làm image Docker
phình to và khởi động chậm. Trong bảng so sánh cuối notebook, Hybrid vẫn cho
Precision@10 tốt hơn NCF đơn lẻ. Muốn thêm lại thì bổ sung một thành phần nữa
vào `HybridRecommender._blend()`.

---

## 2. Cài đặt

Yêu cầu: Python 3.10–3.12, SQL Server đã có `CineHuntDB`.

```bash
cd recommendation-service

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env      # Windows: copy .env.example .env
```

Mở `.env` và điền `DB_PASSWORD` (cùng giá trị đang dùng cho backend NestJS).

### ODBC Driver

`pyodbc` cần **ODBC Driver 17 for SQL Server** cài sẵn ở hệ điều hành.
Thiếu nó sẽ nhận lỗi `Can't open lib 'ODBC Driver 17 for SQL Server'` — pip
install thành công không có nghĩa là driver đã có.

- Windows: tải "Microsoft ODBC Driver 17 for SQL Server" từ trang Microsoft.
- Ubuntu/Debian: xem hướng dẫn `msodbcsql18` của Microsoft.

Không cài được driver thì đổi trong `.env`:

```
DB_CONNECTOR=pymssql
```

`pymssql` không cần ODBC. Đổi lại: nó **không hỗ trợ named instance**, nên nếu
SQL Server của bạn là `MAYTINH\SQLEXPRESS` thì phải bật TCP/IP và dùng cổng
tĩnh 1433 thay vì đặt `DB_INSTANCE`.

---

## 3. Chạy

### Bước 1 — Tạo bảng cache (chỉ làm một lần)

```bash
cd "../San Ve Backend3/cinehunt-backend"
npm run migration:run
```

Lệnh này chạy migration `1722200000000-AddMovieRecommendations`, tạo bảng
`dbo.movie_recommendations`. Chạy file SQL V6.3 trong SSMS **trước**, nếu
không migration sẽ dừng và báo thiếu bảng `dbo.users` / `dbo.movies`.

### Bước 2 — Huấn luyện

```bash
python train.py
```

Kết quả: file `model/recommender.joblib` + ghi top-30 gợi ý mỗi user vào bảng
`movie_recommendations`.

Tuỳ chọn:

```bash
python train.py --no-cache      # chỉ ghi file model, không đụng DB
python train.py --top-n 20      # đổi số phim lưu cache
```

### Bước 3 — Chạy server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Kiểm tra nhanh:

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/recommend/1?limit=5"
```

Tài liệu API tự sinh: <http://localhost:8000/docs>

### Chạy lại sau khi train

`train.py` chỉ ghi ra file; server đang chạy vẫn giữ model cũ trong RAM.
Nạp lại mà không cần restart:

```bash
curl -X POST http://localhost:8000/reload
```

---

## 4. Lịch train

Dữ liệu đặt vé thay đổi hàng ngày. Train một lần rồi để đó vài tháng thì gợi
ý sẽ toàn phim đã ngừng chiếu.

**Linux (cron)** — 3 giờ sáng mỗi ngày:

```
0 3 * * * cd /duong/dan/recommendation-service && .venv/bin/python train.py && curl -s -X POST http://localhost:8000/reload
```

**Windows** — Task Scheduler, chạy `.venv\Scripts\python.exe train.py`.

---

## 5. API

Hợp đồng này **phải khớp** với `src/movie/recommendation.service.ts` bên NestJS.

### `GET /recommend/{user_id}?limit=10`

```json
{
  "userId": 1,
  "items": [
    { "movieId": 4, "score": 0.788056 },
    { "movieId": 13, "score": 0.660643 }
  ],
  "movieIds": [4, 13],
  "source": "MODEL",
  "modelVersion": "v7-hybrid"
}
```

`source` cho biết kết quả đến từ đâu:

| Giá trị      | Ý nghĩa                                                  |
| ------------ | -------------------------------------------------------- |
| `MODEL`      | Model trong RAM, đường đi bình thường                     |
| `CACHE`      | Chưa train xong / chưa nạp được model → đọc bảng cache    |
| `POPULARITY` | Không có cả hai → phim được đặt nhiều nhất 90 ngày qua    |

Service **không bao giờ trả 500** cho endpoint này. Kể cả khi SQL Server chết,
nó trả 200 với danh sách rỗng, vì NestJS đã có lớp fallback riêng
(`findTopBookedMovieIds`). Ném 500 sang đó chỉ làm bẩn log chứ không đổi thứ
người dùng nhìn thấy.

### `GET /health`

Trạng thái service + thông tin model đang nạp. Dùng cho Docker healthcheck.

### `POST /reload`

Nạp lại file model. **Không có xác thực** — chỉ để service lắng nghe trong
mạng nội bộ, đừng mở cổng 8000 ra Internet. Frontend không bao giờ gọi thẳng
vào service này; mọi thứ đi qua NestJS.

---

## 6. Kiểm tra khi chưa có DB

```bash
python smoke_test.py
```

Script dựng dữ liệu giả trong bộ nhớ và kiểm tra: không gợi ý lại phim đã xem,
cold start trả về top phổ biến, điểm nằm trong `[0,1]`, model lưu/nạp lại cho
kết quả giống nhau, và nhánh SVD hoạt động.

Mục đích là tách bạch hai loại lỗi: nếu script này chạy đúng mà gợi ý vẫn
trống, vấn đề nằm ở kết nối DB hoặc ở dữ liệu, không phải ở mô hình.

---

## 7. Docker

```bash
docker build -t cinehunt-recommendation .
docker run --env-file .env -p 8000:8000 cinehunt-recommendation
```

Lưu ý khi chạy chung Docker Compose với backend: `DB_HOST` không còn là
`localhost` mà là **tên service** của container SQL Server, và
`RECOMMENDATION_SERVICE_URL` bên NestJS phải trỏ tới tên container của service
này (`http://recommendation-service:8000`), không phải `localhost`.

---

## 8. Lỗi thường gặp

| Hiện tượng                                             | Nguyên nhân & cách xử lý                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `Can't open lib 'ODBC Driver 17 for SQL Server'`        | Chưa cài ODBC driver. Cài driver hoặc đặt `DB_CONNECTOR=pymssql`.                                                |
| `Login timeout expired`                                 | SQL Server chưa bật TCP/IP, hoặc sai `DB_INSTANCE`. Bật TCP/IP trong SQL Server Configuration Manager.           |
| `Could not parse rfc1738 URL`                           | Mật khẩu có ký tự đặc biệt. Code đã `quote_plus`; nếu vẫn lỗi thì kiểm tra `.env` có dấu nháy thừa không.        |
| `Invalid object name 'dbo.movie_recommendations'`       | Chưa chạy `npm run migration:run` bên backend.                                                                   |
| Train xong nhưng `/health` báo `modelLoaded: false`     | Server nạp model lúc khởi động. Gọi `POST /reload` hoặc restart.                                                  |
| Log báo `Dữ liệu quá ít ... bỏ qua SVD`                 | Bình thường với DB mẫu. Cần ≥ 30 lượt đặt vé / 5 user / 5 phim thì SVD mới có ý nghĩa. Content + Popularity vẫn chạy. |
| Mọi user nhận cùng một danh sách                        | Chưa có đơn PAID/ISSUED nào. Đặt thử vài vé rồi `python train.py` lại.                                            |

---

## 9. Cấu trúc thư mục

```
recommendation-service/
├── app/
│   ├── config.py     Đọc .env, dựng chuỗi kết nối SQLAlchemy
│   ├── db.py         Truy vấn DB: đọc tương tác/phim, ghi bảng cache
│   ├── model.py      HybridRecommender: fit / recommend / save / load
│   └── main.py       FastAPI: /recommend, /health, /reload
├── model/            Nơi chứa recommender.joblib (không commit lên Git)
├── train.py          Script huấn luyện, chạy theo lịch
├── smoke_test.py     Kiểm tra mô hình không cần DB
├── requirements.txt
├── Dockerfile
└── .env.example
```
