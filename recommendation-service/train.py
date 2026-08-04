"""
Huấn luyện mô hình gợi ý từ dữ liệu CineHunt và xuất ra file model.

Chạy:
    python train.py                # train + ghi file + ghi cache vào DB
    python train.py --no-cache     # chỉ ghi file model, không đụng vào DB
    python train.py --top-n 20     # số phim lưu cache cho mỗi user

Nên đặt lịch chạy lại mỗi đêm (cron trên Linux, Task Scheduler trên Windows).
Dữ liệu đặt vé đổi hàng ngày; model train một lần rồi để đó vài tháng sẽ gợi
ý toàn phim đã ngừng chiếu.

VÌ SAO TRAIN LÀ MỘT SCRIPT RIÊNG, KHÔNG NHÉT VÀO FastAPI:
    Phân rã SVD trên toàn bộ ma trận đặt vé mất từ vài giây tới vài phút.
    Nếu train ngay trong tiến trình web, toàn bộ request đang chờ sẽ bị treo
    theo (Python có GIL). Tách riêng: train ghi ra file, web chỉ đọc file.
"""

from __future__ import annotations

import argparse
import logging
import sys

from app.config import get_settings
from app.db import load_interactions, load_movies, save_recommendations
from app.model import HybridRecommender

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("train")


def main() -> int:
    parser = argparse.ArgumentParser(description="Huấn luyện mô hình gợi ý CineHunt")
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Không ghi kết quả vào bảng movie_recommendations",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=None,
        help="Số phim gợi ý lưu cache cho mỗi user (mặc định lấy từ TOP_N_CACHE)",
    )
    args = parser.parse_args()

    settings = get_settings()
    top_n = args.top_n or settings.top_n_cache

    logger.info("Đang đọc dữ liệu từ SQL Server (%s/%s)...", settings.db_host, settings.db_name)
    try:
        movies = load_movies()
        interactions = load_interactions()
    except Exception as exc:
        logger.error("Không kết nối/truy vấn được database: %s", exc)
        logger.error(
            "Kiểm tra lại: (1) đã copy .env.example thành .env chưa, "
            "(2) SQL Server có đang chạy không, "
            "(3) đã cài ODBC Driver 17 for SQL Server chưa "
            "(hoặc đặt DB_CONNECTOR=pymssql để dùng driver thay thế)."
        )
        return 1

    logger.info(
        "Đọc xong: %d phim đang hiển thị, %d cặp (user, phim) có lượt đặt vé.",
        len(movies), len(interactions),
    )

    if interactions.empty:
        logger.warning(
            "Chưa có đơn PAID/ISSUED nào trong DB. Model sẽ chỉ gợi ý theo độ "
            "phổ biến — mọi người dùng nhận cùng một danh sách. Đặt thử vài vé "
            "rồi train lại để thấy kết quả cá nhân hoá."
        )

    model = HybridRecommender(
        weight_svd=settings.weight_svd,
        weight_content=settings.weight_content,
        weight_popularity=settings.weight_popularity,
        svd_components=settings.svd_components,
        model_version=settings.model_version,
    )

    try:
        model.fit(interactions, movies)
    except ValueError as exc:
        logger.error("Huấn luyện thất bại: %s", exc)
        return 1

    model.save(settings.model_path)
    logger.info("Model đã lưu tại: %s", settings.model_path)

    if args.no_cache:
        logger.info("Bỏ qua bước ghi cache (--no-cache).")
        return 0

    user_ids = model.known_user_ids()
    if not user_ids:
        logger.info("Không có user nào trong tập huấn luyện -> không ghi cache.")
        return 0

    rows: list[dict] = []
    for user_id in user_ids:
        for rank, (movie_id, score) in enumerate(model.recommend(user_id, top_n)):
            rows.append(
                {
                    "user_id": int(user_id),
                    "movie_id": int(movie_id),
                    "score": round(max(score, 0.0), 6),
                    "rank_order": rank,
                }
            )

    try:
        written = save_recommendations(rows, settings.model_version)
        logger.info("Đã ghi %d dòng gợi ý cho %d user vào bảng movie_recommendations.",
                    written, len(user_ids))
    except Exception as exc:
        logger.error("Ghi cache thất bại (model vẫn dùng được): %s", exc)
        logger.error(
            "Nhiều khả năng bảng movie_recommendations chưa tồn tại. "
            "Chạy `npm run migration:run` trong thư mục cinehunt-backend."
        )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
