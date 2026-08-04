"""HTTP server của recommendation-service."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
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

_train_lock = threading.Lock()
_train_state: dict = {
    "running": False,
    "startedAt": None,
    "finishedAt": None,
    "exitCode": None,
    "lastError": None,
}


def _load_model() -> None:
    global _model
    path = settings.model_path
    if not path.exists():
        logger.error(
            "CHƯA CÓ FILE MODEL tại %s.\n"
            "    -> Mọi người dùng sẽ nhận CÙNG một danh sách (fallback popularity).\n"
            "    -> Đây là trạng thái bình thường sau khi clone repo: file .joblib "
            "không được commit lên Git (và không nên commit — nó là artifact nhị phân).\n"
            "    -> Tạo model bằng:  python train.py\n"
            "    -> Hoặc gọi:        POST http://<host>:%s/train",
            path,
            settings.port,
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
    if settings.inherited_backend_env:
        logger.info(
            "Kế thừa cấu hình DB còn thiếu từ .env của NestJS: %s",
            settings.inherited_backend_env,
        )
    logger.info(
        "Kết nối DB: connector=%s, host=%s, database=%s",
        settings.resolve_connector(),
        settings.db_host,
        settings.db_name,
    )

    _load_model()

    if _model is None and os.getenv("AUTO_TRAIN_ON_START", "").lower() == "true":
        logger.info("AUTO_TRAIN_ON_START=true -> tự chạy train.py ở nền...")
        threading.Thread(target=_run_training, daemon=True).start()

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
    """
    FIX REC-01 + REC-06 — điểm chẩn đoán để phân biệt bốn trạng thái vốn nhìn
    giống hệt nhau trên giao diện: model thật / cache / popularity / chết hẳn.
    """
    return {
        "status": "ok",
        "modelLoaded": _model is not None,
        "modelPath": str(settings.model_path),
        "modelFileExists": settings.model_path.exists(),
        "modelVersion": _model.model_version if _model else None,
        "trainedAt": _model.trained_at if _model else None,
        "knownUsers": len(_model.user_to_idx) if _model else 0,
        "knownMovies": len(_model.movie_ids) if _model else 0,
        "svdMode": _model.svd_mode if _model else None,
        "dbConnector": settings.resolve_connector(),
        "training": dict(_train_state),
        "effect": (
            "Gợi ý đang được cá nhân hoá bằng model."
            if _model is not None
            else "MỌI người dùng đang nhận cùng một danh sách (fallback popularity). "
            "Chạy `python train.py` hoặc POST /train."
        ),
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



def _run_training() -> None:
    """Chạy `python train.py` trong tiến trình con rồi nạp lại model."""
    global _train_state

    if not _train_lock.acquire(blocking=False):
        logger.warning("Đang có một tiến trình train chạy dở -> bỏ qua yêu cầu này.")
        return

    _train_state.update(
        running=True,
        startedAt=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        finishedAt=None,
        exitCode=None,
        lastError=None,
    )

    try:
        script = settings.model_dir.parent / "train.py"
        logger.info("Bắt đầu train lại model (%s)...", script)

        completed = subprocess.run(
            [sys.executable, str(script)],
            cwd=str(script.parent),
            capture_output=True,
            text=True,
            timeout=int(os.getenv("TRAIN_TIMEOUT_SECONDS", "1800")),
        )

        _train_state["exitCode"] = completed.returncode

        if completed.returncode == 0:
            logger.info("Train xong. Đang nạp lại model vào bộ nhớ...")
            _load_model()
        else:
            _train_state["lastError"] = (completed.stderr or "").strip()[-2000:]
            logger.error(
                "train.py thoát với mã %s:\n%s",
                completed.returncode,
                _train_state["lastError"],
            )
    except subprocess.TimeoutExpired:
        _train_state["lastError"] = "Train vượt quá thời gian cho phép."
        logger.error("Train bị huỷ vì quá thời gian (TRAIN_TIMEOUT_SECONDS).")
    except Exception as exc:  # noqa: BLE001 - không được để luồng nền chết câm
        _train_state["lastError"] = str(exc)
        logger.exception("Không chạy được train.py.")
    finally:
        _train_state.update(
            running=False,
            finishedAt=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )
        _train_lock.release()


@app.post("/train")
def train(background_tasks: BackgroundTasks) -> JSONResponse:
    """
    Khởi động train ở NỀN và trả lời ngay.

    Không chờ train xong mới trả response: NestJS đặt timeout 20 giây cho lời
    gọi này, còn train có thể mất vài phút. Trả 202 rồi để client theo dõi
    tiến độ qua GET /health -> training.
    """
    if _train_state["running"]:
        return JSONResponse(
            status_code=409,
            content={
                "started": False,
                "message": "Đang có một tiến trình train chạy dở.",
                "training": dict(_train_state),
            },
        )

    background_tasks.add_task(_run_training)
    return JSONResponse(
        status_code=202,
        content={
            "started": True,
            "message": "Đã khởi động train ở nền. Theo dõi tiến độ ở GET /health.",
        },
    )
