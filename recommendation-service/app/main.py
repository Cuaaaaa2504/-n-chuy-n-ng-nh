"""
HTTP server của recommendation-service.

HỢP ĐỒNG API — phải khớp CHÍNH XÁC với
`San Ve Backend3/cinehunt-backend/src/movie/recommendation.service.ts`:

    GET /recommend/{user_id}?limit=10

Cụ thể là `fetchMovieIdsFromModel()` gọi tới
`${baseUrl}/recommend/${userId}` kèm query `limit`. Đổi đường dẫn ở đây mà
quên sửa bên NestJS thì mọi request rơi vào catchError, log ra một dòng
warning rồi trả về fallback — trang chủ VẪN CHẠY BÌNH THƯỜNG nên không ai
phát hiện ra là model chưa bao giờ được dùng. Đây là kiểu lỗi im lặng khó
chịu nhất, nên hai bên phải giữ nguyên đường dẫn.

Bên NestJS chấp nhận nhiều dạng payload (mảng số, {movieIds}, {items}).
Ở đây trả về dạng đầy đủ nhất: {items: [{movieId, score}], movieIds: [...]}.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import get_settings
from .model import HybridRecommender

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("recommendation-service")

settings = get_settings()

# Model được nạp MỘT LẦN lúc khởi động và giữ trong RAM.
# Nạp lại ở mỗi request là sai lầm kinh điển: joblib.load() mất hàng trăm ms,
# nhân với mỗi lượt vào trang chủ thì service tự bóp cổ chính nó.
_model: HybridRecommender | None = None


def _load_model() -> None:
    global _model
    path = settings.model_path
    if not path.exists():
        logger.warning(
            "Chưa có file model tại %s. Service vẫn chạy nhưng sẽ dùng cache/"
            "popularity từ DB. Chạy `python train.py` để tạo model.",
            path,
        )
        _model = None
        return
    try:
        _model = HybridRecommender.load(path)
        logger.info(
            "Đã nạp model %s (train lúc %s, %d user, %d phim).",
            _model.model_version,
            _model.trained_at or "không rõ",
            len(_model.user_to_idx),
            len(_model.movie_ids),
        )
    except Exception:
        logger.exception("Không nạp được file model, service chuyển sang chế độ dự phòng.")
        _model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield


app = FastAPI(
    title="CineHunt Recommendation Service",
    description="Gợi ý phim cá nhân hoá (Hybrid: SVD + Content-based + Popularity)",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RecommendedMovie(BaseModel):
    movieId: int
    score: float


class RecommendResponse(BaseModel):
    userId: int
    items: list[RecommendedMovie]
    # Danh sách id phẳng — NestJS đọc được cả hai dạng, giữ lại cho tiện debug.
    movieIds: list[int]
    source: str          # MODEL | CACHE | POPULARITY
    modelVersion: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    """Dùng cho Docker healthcheck và để kiểm tra nhanh service còn sống."""
    return {
        "status": "ok",
        "modelLoaded": _model is not None,
        "modelVersion": _model.model_version if _model else None,
        "trainedAt": _model.trained_at if _model else None,
        "knownUsers": len(_model.user_to_idx) if _model else 0,
    }


@app.get("/recommend/{user_id}", response_model=RecommendResponse)
def recommend(
    user_id: int,
    limit: int = Query(10, ge=1, le=50),
) -> RecommendResponse:
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id phải là số nguyên dương")

    # 1) Đường đi bình thường: model đã nạp trong RAM.
    if _model is not None:
        pairs = _model.recommend(user_id, limit)
        if pairs:
            return RecommendResponse(
                userId=user_id,
                items=[RecommendedMovie(movieId=m, score=round(s, 6)) for m, s in pairs],
                movieIds=[m for m, _ in pairs],
                source="MODEL",
                modelVersion=_model.model_version,
            )

    # 2) Model chưa train (hoặc không trả được gì): đọc bảng cache.
    #    Import ở trong hàm để service vẫn khởi động được khi DB đang chết —
    #    /health phải trả lời được kể cả lúc SQL Server tắt.
    try:
        from .db import load_cached_recommendations, load_popular_movie_ids

        cached = load_cached_recommendations(user_id, limit)
        if cached:
            return RecommendResponse(
                userId=user_id,
                items=[RecommendedMovie(movieId=m, score=0.0) for m in cached],
                movieIds=cached,
                source="CACHE",
            )

        # 3) Phương án cuối: phim ăn khách 90 ngày gần đây.
        popular = load_popular_movie_ids(limit)
        return RecommendResponse(
            userId=user_id,
            items=[RecommendedMovie(movieId=m, score=0.0) for m in popular],
            movieIds=popular,
            source="POPULARITY",
        )
    except Exception:
        logger.exception("Không truy vấn được DB khi chạy phương án dự phòng.")
        # Trả 200 với danh sách rỗng, KHÔNG trả 500.
        # NestJS đã có fallback riêng (findTopBookedMovieIds); ném 500 sang
        # đó chỉ làm bẩn log chứ không đổi kết quả người dùng nhìn thấy.
        return RecommendResponse(
            userId=user_id,
            items=[],
            movieIds=[],
            source="POPULARITY",
        )


@app.post("/reload")
def reload_model() -> JSONResponse:
    """
    Nạp lại file model sau khi chạy train.py, KHÔNG cần restart service.

    CẢNH BÁO BẢO MẬT: endpoint này không có xác thực. Chỉ để service lắng
    nghe trong mạng nội bộ (Docker network) hoặc chặn cổng 8000 từ bên
    ngoài. Frontend không bao giờ gọi thẳng vào đây — mọi thứ đi qua NestJS.
    """
    _load_model()
    return JSONResponse(
        {
            "reloaded": _model is not None,
            "modelVersion": _model.model_version if _model else None,
            "trainedAt": _model.trained_at if _model else None,
        }
    )
