"""
Kiểm tra nhanh mô hình mà KHÔNG cần SQL Server.

Chạy:  python smoke_test.py

Mục đích: tách bạch hai loại lỗi. Khi gợi ý không ra kết quả, câu hỏi đầu
tiên luôn là "model sai hay kết nối DB sai?". Script này dựng dữ liệu giả
ngay trong bộ nhớ, nên nếu nó chạy đúng thì phần mô hình không có vấn đề —
lỗi nằm ở chuỗi kết nối hoặc ở dữ liệu.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import pandas as pd

from app.model import HybridRecommender


def build_fake_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    6 user, 8 phim, hai nhóm sở thích rõ rệt:
      - user 1,2,3 xem phim Hành động / Phiêu lưu (phim 1-4)
      - user 4,5,6 xem phim Tình cảm / Hài       (phim 5-8)
    Model tốt phải gợi ý cho user 1 các phim hành động mà user 1 chưa xem.
    """
    movies = pd.DataFrame(
        [
            (1, "Hành Động A", "NOW_SHOWING", 4.5, "Hành động|Phiêu lưu"),
            (2, "Hành Động B", "NOW_SHOWING", 4.2, "Hành động"),
            (3, "Hành Động C", "NOW_SHOWING", 4.0, "Hành động|Phiêu lưu"),
            (4, "Phiêu Lưu D", "NOW_SHOWING", 3.8, "Phiêu lưu"),
            (5, "Tình Cảm E", "NOW_SHOWING", 4.4, "Tình cảm"),
            (6, "Tình Cảm F", "NOW_SHOWING", 4.1, "Tình cảm|Hài"),
            (7, "Hài G", "NOW_SHOWING", 3.9, "Hài"),
            (8, "Hài H", "COMING_SOON", 0.0, "Hài|Tình cảm"),
        ],
        columns=["movie_id", "title", "status", "average_rating", "genres"],
    )

    action_users = {1: [1, 2], 2: [1, 3], 3: [2, 3, 4]}
    romance_users = {4: [5, 6], 5: [6, 7], 6: [5, 7, 8]}

    records = []
    for user_id, watched in {**action_users, **romance_users}.items():
        for movie_id in watched:
            records.append(
                {"user_id": user_id, "movie_id": movie_id, "booking_count": 1, "rating": 3.5}
            )

    return pd.DataFrame(records), movies


def build_larger_fake_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    60 user x 30 phim, chia thành 3 nhóm sở thích. Đủ lớn để `svds` chạy
    (ngưỡng trong model.py là 30 tương tác / 5 user / 5 phim).
    """
    import random

    random.seed(7)
    genre_pool = ["Hành động", "Tình cảm", "Kinh dị"]

    movies = pd.DataFrame(
        [
            (
                movie_id,
                f"Phim {movie_id}",
                "NOW_SHOWING",
                round(3.0 + (movie_id % 5) * 0.4, 2),
                genre_pool[movie_id % 3],
            )
            for movie_id in range(1, 31)
        ],
        columns=["movie_id", "title", "status", "average_rating", "genres"],
    )

    records = []
    for user_id in range(1, 61):
        group = user_id % 3                      # nhóm sở thích của user
        pool = [m for m in range(1, 31) if m % 3 == group]
        for movie_id in random.sample(pool, 4):
            records.append(
                {
                    "user_id": user_id,
                    "movie_id": movie_id,
                    "booking_count": 1,
                    "rating": 3.5,
                }
            )

    return pd.DataFrame(records), movies


def main() -> int:
    interactions, movies = build_fake_data()

    model = HybridRecommender(svd_components=3).fit(interactions, movies)
    failures: list[str] = []

    # --- 1. User đã có lịch sử ------------------------------------------
    recs = model.recommend(1, top_n=3)
    ids = [movie_id for movie_id, _ in recs]
    print(f"User 1 (mê hành động, đã xem phim 1 & 2) -> gợi ý: {ids}")

    if not ids:
        failures.append("Không gợi ý được gì cho user đã có lịch sử.")
    if 1 in ids or 2 in ids:
        failures.append("Gợi ý lại phim user đã đặt vé — bộ lọc `watched` hỏng.")
    if ids and ids[0] not in (3, 4):
        failures.append(
            f"Gợi ý đầu tiên là phim {ids[0]}, đáng lẽ phải là phim hành động/"
            "phiêu lưu (3 hoặc 4)."
        )

    # --- 2. Cold start ---------------------------------------------------
    cold = model.recommend(999, top_n=3)
    print(f"User 999 (chưa từng đặt vé)     -> gợi ý: {[m for m, _ in cold]}")
    if not cold:
        failures.append("Cold start trả về danh sách rỗng, đáng lẽ phải trả top phổ biến.")

    # --- 3. Điểm nằm trong [0, 1] ---------------------------------------
    if any(not (0.0 <= score <= 1.0) for _, score in recs + cold):
        failures.append("Điểm nằm ngoài [0,1] — cột score DECIMAL(9,6) sẽ tràn.")

    # --- 4. Lưu / nạp lại -------------------------------------------------
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "recommender.joblib"
        model.save(path)
        reloaded = HybridRecommender.load(path)
        if [m for m, _ in reloaded.recommend(1, 3)] != ids:
            failures.append("Model sau khi nạp lại cho kết quả khác — lỗi serialize.")
    print("Lưu và nạp lại model: OK")

    # --- 5. Nhánh SVD ------------------------------------------------------
    # Bộ dữ liệu 6 user ở trên cố tình nhỏ để kiểm tra đường "dữ liệu quá ít
    # -> tự tắt SVD". Phần này dựng bộ lớn hơn để nhánh SVD thật sự chạy.
    big_interactions, big_movies = build_larger_fake_data()
    big_model = HybridRecommender(svd_components=8).fit(big_interactions, big_movies)

    if big_model.u_sigma is None:
        failures.append("SVD không chạy dù dữ liệu đã đủ lớn.")
    else:
        big_recs = [m for m, _ in big_model.recommend(1, top_n=5)]
        print(f"[SVD] User 1 trong bộ dữ liệu lớn -> gợi ý: {big_recs}")
        if len(big_recs) != 5:
            failures.append(f"Yêu cầu 5 gợi ý nhưng nhận {len(big_recs)}.")
        if set(big_recs) & set(big_model.watched.get(1, set())):
            failures.append("Nhánh SVD gợi ý lại phim đã xem.")

    # --- Kết luận ---------------------------------------------------------
    if failures:
        print("\nKHÔNG ĐẠT:")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("\nTất cả kiểm tra đều đạt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
