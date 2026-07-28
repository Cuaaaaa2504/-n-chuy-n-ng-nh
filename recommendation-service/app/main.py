"""HTTP server của recommendation-service."""

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
_model: HybridRecommender | None = None


def _load_model() -> None:
    global _model
    path = settings.model_path
    if not path.exists():
        logger.warning(
            "Chưa có file model tại %s. Service vẫn chạy bằng cache/popularity.",
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
        logger.exception("Không nạp được file model, chuyển sang chế độ dự phòng.")
        _model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield


app = FastAPI(
    title="CineHunt Recommendation Service",
    description="Gợi ý phim cá nhân hoá (Hybrid: SVD + Content-based + Popularity)",
    version="1.0.1",
    lifespan=lifespan,
)


class RecommendedMovie(BaseModel):
    movieId: int
    score: float


class RecommendResponse(BaseModel):
    userId: int
    items: list[RecommendedMovie]
    movieIds: list[int]
    source: str
    modelVersion: str | None = None


@app.get("/health")
def health() -> dict:
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

    if _model is not None:
        known_user = int(user_id) in _model.user_to_idx
        pairs = _model.recommend(user_id, limit)
        if pairs:
            return RecommendResponse(
                userId=user_id,
                items=[
                    RecommendedMovie(movieId=movie_id, score=round(score, 6))
                    for movie_id, score in pairs
                ],
                movieIds=[movie_id for movie_id, _ in pairs],
                source="MODEL" if known_user else "POPULARITY",
                modelVersion=_model.model_version,
            )

    try:
        from .db import load_cached_recommendations, load_popular_movie_ids

        cached = load_cached_recommendations(user_id, limit)
        if cached:
            return RecommendResponse(
                userId=user_id,
                items=[RecommendedMovie(movieId=movie_id, score=0.0) for movie_id in cached],
                movieIds=cached,
                source="CACHE",
            )

        popular = load_popular_movie_ids(limit)
        return RecommendResponse(
            userId=user_id,
            items=[RecommendedMovie(movieId=movie_id, score=0.0) for movie_id in popular],
            movieIds=popular,
            source="POPULARITY",
        )
    except Exception:
        logger.exception("Không truy vấn được DB khi chạy phương án dự phòng.")
        return RecommendResponse(
            userId=user_id,
            items=[],
            movieIds=[],
            source="POPULARITY",
        )


@app.post("/reload")
def reload_model() -> JSONResponse:
    _load_model()
    return JSONResponse(
        {
            "reloaded": _model is not None,
            "modelVersion": _model.model_version if _model else None,
            "trainedAt": _model.trained_at if _model else None,
        }
    )
