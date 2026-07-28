"""
Tầng truy cập dữ liệu.

QUYẾT ĐỊNH KIẾN TRÚC (trả lời câu hỏi số 3 ở mục Database của báo cáo:
"Python service tự query DB hay NestJS truyền features sang?"):

    -> Python service TỰ QUERY DB, ở chế độ CHỈ ĐỌC cho phần huấn luyện.

Lý do:
  1. Model cần TOÀN BỘ ma trận user x movie để phân rã SVD. Nếu bắt NestJS
     truyền features thì mỗi request phải bê cả chục nghìn dòng qua HTTP —
     vô lý cả về băng thông lẫn thời gian.
  2. Huấn luyện là việc chạy NGẦM theo lịch (cron/Task Scheduler), không nằm
     trong luồng request của người dùng. Nó không cần đi qua NestJS.
  3. NestJS vẫn giữ vai trò cổng vào duy nhất của FRONTEND: browser chỉ nói
     chuyện với NestJS, không bao giờ gọi thẳng service Python.

Quyền ghi duy nhất mà service này cần là bảng cache `movie_recommendations`
(do migration 1722200000000 tạo). Ngoài bảng đó ra, không ghi gì hết.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from .config import get_settings

logger = logging.getLogger(__name__)

_engine: Engine | None = None


def get_engine() -> Engine:
    """Engine dùng chung, tạo một lần (lazy)."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.sqlalchemy_url(),
            pool_pre_ping=True,  # tự phát hiện connection đã chết sau khi idle
            fast_executemany=(settings.db_connector == "pyodbc"),
        )
    return _engine


@contextmanager
def connection() -> Iterator:
    engine = get_engine()
    with engine.begin() as conn:
        yield conn


# ---------------------------------------------------------------------------
# LỚP VIEW HỖ TRỢ (migration 1722400000000-AddRecommendationViews.ts)
# ---------------------------------------------------------------------------
#
# Ba view dbo.vw_recommendation_interactions / vw_movie_content_features /
# vw_movie_popularity_90d đóng gói phần join + lọc trạng thái vốn bị lặp ba
# lần trong file này.
#
# VÌ SAO VẪN GIỮ SQL CŨ LÀM ĐƯỜNG LÙI:
# Service này KHÔNG được phép chết chỉ vì thiếu một migration. Người mới clone
# repo về, chạy `python train.py` trước khi chạy `npm run migration:run` là
# tình huống hoàn toàn bình thường. Nếu bắt buộc phải có view, họ nhận
# "Invalid object name 'dbo.vw_recommendation_interactions'" — thông báo không
# gợi ý gì về việc phải sang thư mục backend chạy migration.
#
# Vì vậy: dùng view nếu có, không có thì tự động chạy SQL cũ (kết quả giống
# hệt) và log một dòng warning chỉ rõ cách bật lớp view lên.

_REQUIRED_VIEWS = (
    "dbo.vw_recommendation_interactions",
    "dbo.vw_movie_content_features",
    "dbo.vw_movie_popularity_90d",
)

# None = chưa kiểm tra. Chỉ hỏi DB một lần cho mỗi tiến trình: câu này rẻ nhưng
# load_interactions()/load_movies() được gọi liên tục trong lúc train.
_views_ready: bool | None = None


def views_available() -> bool:
    """True nếu cả ba view hỗ trợ đều tồn tại trong DB."""
    global _views_ready
    if _views_ready is not None:
        return _views_ready

    sql = text(
        """
        SELECT COUNT(*) FROM sys.views AS v
        INNER JOIN sys.schemas AS s ON s.schema_id = v.schema_id
        WHERE s.name = 'dbo'
          AND v.name IN (
            'vw_recommendation_interactions',
            'vw_movie_content_features',
            'vw_movie_popularity_90d'
          )
        """
    )
    try:
        with connection() as conn:
            found = int(conn.execute(sql).scalar() or 0)
    except Exception:
        # DB không truy cập được -> để hàm gọi phía sau ném lỗi thật sự của nó,
        # đừng biến lỗi kết nối thành "thiếu view" gây hiểu nhầm.
        logger.debug("Không kiểm tra được danh sách view, tạm coi như chưa có.")
        return False

    _views_ready = found == len(_REQUIRED_VIEWS)
    if not _views_ready:
        logger.warning(
            "Chưa có đủ lớp view hỗ trợ (%s). Đang dùng câu SQL nội tuyến — kết "
            "quả giống hệt, chỉ là logic bị lặp lại ở nhiều nơi. Bật lớp view: "
            'cd "../San Ve Backend3/cinehunt-backend" && npm run migration:run',
            ", ".join(_REQUIRED_VIEWS),
        )
    return _views_ready


# ---------------------------------------------------------------------------
# ĐỌC DỮ LIỆU HUẤN LUYỆN
# ---------------------------------------------------------------------------

def load_interactions() -> pd.DataFrame:
    """
    Ma trận tương tác user x movie.

    KHÁC BIỆT QUAN TRỌNG SO VỚI NOTEBOOK — đọc kỹ trước khi sửa:

    Notebook v7 huấn luyện trên MovieLens 1M, ở đó có cột `Rating` 1..5 do
    người dùng chấm tay (explicit feedback). CineHunt KHÔNG có bảng rating
    nào cả — kiểm tra file SQL V6.3: 28 bảng, không có `ratings`.

    Vì vậy ở production ta dùng IMPLICIT FEEDBACK: hành vi đặt vé.
    Quy đổi sang thang 1..5 để tái sử dụng nguyên si phần SVD/Content của
    notebook:

        rating_ngầm = 3.5 + 0.5 * (số lần đặt vé phim đó - 1),  chặn trần 5.0

    Đặt vé 1 lần ≈ 3.5 điểm (đủ để coi là thích), đặt lại lần nữa thì cộng
    thêm. Đây là cách quy đổi phổ biến cho implicit feedback, không phải con
    số bịa: mua vé là tín hiệu mạnh hơn nhiều so với việc bấm xem trang.

    Chỉ tính đơn ở trạng thái PAID/ISSUED. Đơn PENDING_PAYMENT có thể không
    bao giờ được trả tiền; đơn CANCELLED/REFUNDED là tín hiệu ngược.
    """
    settings = get_settings()
    statuses = settings.positive_booking_statuses

    # Đường đi ưu tiên: view đã đóng gói sẵn join + lọc + công thức quy đổi.
    #
    # ĐÁNH ĐỔI CẦN BIẾT: view hardcode PAID/ISSUED, nên nếu ai đó đổi
    # POSITIVE_BOOKING_STATUSES trong .env thành giá trị khác thì view không
    # phản ánh được. Trường hợp đó phải quay về SQL nội tuyến, nếu không sẽ
    # train trên tập dữ liệu KHÁC với cấu hình mà không có gì báo.
    default_statuses = {"PAID", "ISSUED"}
    if views_available() and set(statuses) == default_statuses:
        with connection() as conn:
            df = pd.read_sql(
                text(
                    """
                    SELECT user_id, movie_id, booking_count, last_booked_at,
                           CAST(implicit_rating AS FLOAT) AS rating
                    FROM dbo.vw_recommendation_interactions
                    """
                ),
                conn,
            )
        return df

    if set(statuses) != default_statuses:
        logger.info(
            "POSITIVE_BOOKING_STATUSES=%s khác mặc định PAID,ISSUED -> bỏ qua "
            "view và dùng SQL nội tuyến để tôn trọng cấu hình .env.",
            ",".join(statuses),
        )

    # Tham số hoá danh sách status thay vì nối chuỗi (chống SQL injection và
    # để driver tự escape).
    placeholders = ", ".join(f":st{i}" for i in range(len(statuses)))
    params = {f"st{i}": s for i, s in enumerate(statuses)}

    sql = text(
        f"""
        SELECT
            bo.user_id                AS user_id,
            st.movie_id               AS movie_id,
            COUNT(DISTINCT bo.booking_id) AS booking_count,
            MAX(bo.created_at)        AS last_booked_at
        FROM dbo.booking_orders AS bo
        INNER JOIN dbo.showtimes AS st
                ON st.showtime_id = bo.showtime_id
        INNER JOIN dbo.users AS u
                ON u.user_id = bo.user_id
               AND u.status = 'ACTIVE'
        WHERE bo.status IN ({placeholders})
        GROUP BY bo.user_id, st.movie_id
        """
    )

    with connection() as conn:
        df = pd.read_sql(sql, conn, params=params)

    if df.empty:
        return df

    df["rating"] = (3.5 + 0.5 * (df["booking_count"] - 1)).clip(upper=5.0)
    return df


def load_movies() -> pd.DataFrame:
    """
    Danh mục phim + vector thể loại.

    LỌC Ở ĐÂY, KHÔNG LỌC Ở NESTJS: phim ENDED/HIDDEN không bao giờ được
    gợi ý. Gợi ý một phim đã ngừng chiếu thì người dùng bấm vào chỉ thấy
    trang trống — tệ hơn là không gợi ý gì.

    Lưu ý `STRING_AGG` cần SQL Server 2017 trở lên. DB của đồ án là V6.3
    chạy trên SQL Server 2019/2022 nên dùng thoải mái.
    """
    if views_available():
        with connection() as conn:
            return pd.read_sql(
                text(
                    """
                    SELECT movie_id, title, status, average_rating, genres
                    FROM dbo.vw_movie_content_features
                    """
                ),
                conn,
            )

    sql = text(
        """
        SELECT
            m.movie_id                                   AS movie_id,
            m.title                                      AS title,
            m.status                                     AS status,
            CAST(m.average_rating AS FLOAT)              AS average_rating,
            ISNULL(
                STRING_AGG(CAST(g.genre_name AS NVARCHAR(MAX)), '|'),
                N''
            )                                            AS genres
        FROM dbo.movies AS m
        LEFT JOIN dbo.movie_genres AS mg ON mg.movie_id = m.movie_id
        LEFT JOIN dbo.genres       AS g  ON g.genre_id  = mg.genre_id
        WHERE m.status IN ('NOW_SHOWING', 'COMING_SOON')
        GROUP BY m.movie_id, m.title, m.status, m.average_rating
        """
    )

    with connection() as conn:
        return pd.read_sql(sql, conn)


# ---------------------------------------------------------------------------
# GHI CACHE
# ---------------------------------------------------------------------------

def save_recommendations(rows: list[dict], model_version: str) -> int:
    """
    Ghi kết quả top-N vào bảng cache `movie_recommendations`.

    Bảng này do migration 1722200000000-AddMovieRecommendations.ts tạo, có
    ràng buộc UNIQUE(user_id, movie_id) -> INSERT lại lần thứ hai sẽ vi phạm
    khoá. Cách xử lý: xoá sạch rồi chèn lại trong CÙNG MỘT transaction, để
    không có khoảnh khắc nào bảng rỗng nếu ai đó đọc song song.

    `rows` là list dict: {user_id, movie_id, score, rank_order}.
    """
    if not rows:
        logger.warning("Không có gợi ý nào để ghi vào cache.")
        return 0

    with connection() as conn:
        conn.execute(text("DELETE FROM dbo.movie_recommendations"))

        # executemany: chèn theo lô thay vì từng dòng một.
        conn.execute(
            text(
                """
                INSERT INTO dbo.movie_recommendations
                    (user_id, movie_id, score, rank_order,
                     algorithm, model_version, generated_at)
                VALUES
                    (:user_id, :movie_id, :score, :rank_order,
                     'HYBRID', :model_version, SYSDATETIME())
                """
            ),
            [{**row, "model_version": model_version} for row in rows],
        )

    return len(rows)


def load_cached_recommendations(user_id: int, limit: int) -> list[int]:
    """
    Đọc gợi ý đã cache. Dùng làm phương án dự phòng khi file model chưa
    được train (server vừa dựng, chưa ai chạy train.py).
    """
    sql = text(
        """
        SELECT TOP (:limit) movie_id
        FROM dbo.movie_recommendations
        WHERE user_id = :user_id
        ORDER BY rank_order ASC
        """
    )
    with connection() as conn:
        rows = conn.execute(sql, {"user_id": user_id, "limit": limit}).fetchall()
    return [int(r[0]) for r in rows]


def load_popular_movie_ids(limit: int) -> list[int]:
    """
    Phương án cuối cùng: phim được đặt nhiều nhất trong 90 ngày gần đây.
    Không cần model, không cần cache — chỉ cần DB sống là chạy được.
    """
    if views_available():
        # ORDER BY nằm Ở ĐÂY chứ không nằm trong view: SQL Server không đảm bảo
        # thứ tự của một view kể cả khi view có TOP + ORDER BY bên trong.
        view_sql = text(
            """
            SELECT TOP (:limit) movie_id
            FROM dbo.vw_movie_popularity_90d
            ORDER BY booking_count DESC
            """
        )
        with connection() as conn:
            rows = conn.execute(view_sql, {"limit": limit}).fetchall()
        return [int(r[0]) for r in rows]

    sql = text(
        """
        SELECT TOP (:limit)
            st.movie_id,
            COUNT(*) AS booking_count
        FROM dbo.booking_orders AS bo
        INNER JOIN dbo.showtimes AS st ON st.showtime_id = bo.showtime_id
        INNER JOIN dbo.movies    AS m  ON m.movie_id     = st.movie_id
        WHERE bo.status IN ('PAID', 'ISSUED')
          AND bo.created_at >= DATEADD(DAY, -90, SYSDATETIME())
          AND m.status IN ('NOW_SHOWING', 'COMING_SOON')
        GROUP BY st.movie_id
        ORDER BY COUNT(*) DESC
        """
    )
    with connection() as conn:
        rows = conn.execute(sql, {"limit": limit}).fetchall()
    return [int(r[0]) for r in rows]
