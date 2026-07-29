# Thư mục model

File `recommender.joblib` được sinh ra ở đây, **không** nằm trong Git.

## Sau khi clone repo, chạy đúng 3 bước

```bash
cd recommendation-service
pip install -r requirements.txt
python train.py
```

Nếu chưa cấu hình `.env` riêng cho service này thì cũng không sao — từ bản vá
REC-04, `app/config.py` tự kế thừa các biến `DB_*` còn thiếu từ
`San Ve Backend3/cinehunt-backend/.env`.

## Kiểm tra đã có model chưa

```bash
curl http://localhost:8000/health
```

- `modelLoaded: true`  → gợi ý đang được cá nhân hoá thật.
- `modelLoaded: false` → mọi người dùng nhận cùng một danh sách theo độ phổ biến.
  Trường `effect` trong response nói rõ điều này.

## Train lại không cần dừng service

```bash
curl -X POST http://localhost:8000/train
```

Backend NestJS cũng tự gọi endpoint này lúc 3 giờ sáng mỗi ngày (xem
`recommendation.scheduler.ts`, FIX REC-05).
