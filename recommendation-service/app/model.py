"""
Mô hình Hybrid — bản production hoá của notebook
`movie_recommendation_v7_balanced_format_input_features_reviewed`.

Ba thành phần được giữ nguyên như notebook:

    hybrid = 0.6 * SVD + 0.3 * Content-based + 0.1 * Popularity

Thành phần Neural CF của notebook KHÔNG được đưa lên production. Lý do nằm
ở requirements.txt: nó kéo theo tensorflow, và trong bảng so sánh cuối
notebook, Hybrid (không NCF) vẫn cho Precision@10 tốt hơn NCF đơn lẻ. Muốn
thêm lại sau này thì chỉ cần bổ sung một thành phần nữa vào `_blend()`.

CÁCH LƯU: `joblib` chứ không phải `pickle` thuần. joblib nén mảng numpy tốt
hơn nhiều (file nhỏ hơn vài lần) và là chuẩn của scikit-learn.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds

logger = logging.getLogger(__name__)

MIN_INTERACTIONS_FOR_SVD = 30
MIN_USERS_FOR_SVD = 5
MIN_MOVIES_FOR_SVD = 5


def _minmax(values: np.ndarray) -> np.ndarray:
    """
    Đưa một vector điểm về [0, 1].

    Cộng 1e-9 ở mẫu số để tránh chia cho 0 khi mọi phim cùng điểm — trường
    hợp này xảy ra thật với DB mẫu mới cài (mọi average_rating đều = 0).
    """
    if values.size == 0:
        return values
    lo = float(np.min(values))
    hi = float(np.max(values))
    return np.clip((values - lo) / (hi - lo + 1e-9), 0.0, 1.0)


@dataclass
class HybridRecommender:
    """Toàn bộ trạng thái mô hình. Đối tượng này chính là thứ được lưu ra file."""

    weight_svd: float = 0.6
    weight_content: float = 0.3
    weight_popularity: float = 0.1
    svd_components: int = 50
    model_version: str = "v7-hybrid"

    user_to_idx: dict[int, int] = field(default_factory=dict)
    movie_ids: np.ndarray = field(default_factory=lambda: np.array([], dtype=np.int64))
    movie_to_idx: dict[int, int] = field(default_factory=dict)

    # SVD
    u_sigma: np.ndarray | None = None
    vt: np.ndarray | None = None
    user_mean: np.ndarray = field(default_factory=lambda: np.array([]))
    global_mean: float = 3.5
    svd_mode: str = "none"

    genre_names: list[str] = field(default_factory=list)
    movie_genre_matrix: np.ndarray | None = None   # (n_movies, n_genres), đã chuẩn hoá L2
    user_profiles: np.ndarray | None = None        # (n_users, n_genres), đã chuẩn hoá L2

    popularity: np.ndarray = field(default_factory=lambda: np.array([]))  # đã ở [0,1]

    watched: dict[int, set[int]] = field(default_factory=dict)

    trained_at: str = ""
    n_interactions: int = 0

    # HUẤN LUYỆN
    def fit(self, interactions: pd.DataFrame, movies: pd.DataFrame) -> "HybridRecommender":
        """
        interactions: user_id, movie_id, rating, booking_count
        movies:       movie_id, title, status, average_rating, genres ('A|B|C')
        """
        if movies.empty:
            raise ValueError(
                "Không có phim nào ở trạng thái NOW_SHOWING/COMING_SOON. "
                "Hãy chạy file CineHunt_Database_V6_3_With_Sample_Data.sql trước."
            )

        self.movie_ids = movies["movie_id"].astype(np.int64).to_numpy()
        self.movie_to_idx = {int(m): i for i, m in enumerate(self.movie_ids)}
        n_movies = len(self.movie_ids)

        if not interactions.empty:
            interactions = interactions[
                interactions["movie_id"].isin(self.movie_to_idx)
            ].copy()

        self.n_interactions = int(len(interactions))
        self._fit_popularity(movies, interactions)
        self._fit_content(movies)

        if interactions.empty:
            logger.warning(
                "Chưa có lượt đặt vé nào (PAID/ISSUED). Mô hình chỉ chạy được "
                "nhánh Popularity — mọi user sẽ nhận cùng một danh sách."
            )
            self.user_to_idx = {}
            self.trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            return self

        user_ids = np.sort(interactions["user_id"].unique())
        self.user_to_idx = {int(u): i for i, u in enumerate(user_ids)}
        n_users = len(user_ids)

        rows = interactions["user_id"].map(self.user_to_idx).to_numpy(dtype=np.int64)
        cols = interactions["movie_id"].map(self.movie_to_idx).to_numpy(dtype=np.int64)
        vals = interactions["rating"].to_numpy(dtype=np.float64)

        self.watched = {
            int(uid): set(int(m) for m in grp["movie_id"])
            for uid, grp in interactions.groupby("user_id")
        }

        self.global_mean = float(vals.mean())
        self._fit_svd(rows, cols, vals, n_users, n_movies)
        self._fit_user_profiles(interactions, n_users)

        self.trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        logger.info(
            "Đã huấn luyện: %d user, %d phim, %d tương tác.",
            n_users, n_movies, self.n_interactions,
        )
        return self

    def _fit_popularity(self, movies: pd.DataFrame, interactions: pd.DataFrame) -> None:
        """
        Điểm phổ biến kiểu Bayesian (giống công thức IMDb weighted rating
        dùng trong notebook, mục 15):

            score = (v / (v + m)) * R  +  (m / (v + m)) * C

        v = số lượt đặt, R = điểm trung bình của phim, C = điểm trung bình
        toàn hệ thống, m = ngưỡng (phân vị 75 của số lượt đặt).

        Ý nghĩa: một phim có đúng 1 lượt đặt và được chấm 5 sao KHÔNG được
        phép đứng trên phim có 500 lượt đặt và 4.5 sao. Lấy trung bình trần
        trụi thì đúng là nó đứng trên thật.
        """
        counts = pd.Series(0, index=movies["movie_id"], dtype=float)
        if not interactions.empty:
            grouped = interactions.groupby("movie_id")["booking_count"].sum()
            counts = counts.add(grouped, fill_value=0.0)
        counts = counts.reindex(movies["movie_id"]).fillna(0.0)

        v = counts.to_numpy(dtype=float)
        r = movies["average_rating"].fillna(0.0).to_numpy(dtype=float)

        positive = v[v > 0]
        m = float(np.quantile(positive, 0.75)) if positive.size else 1.0
        m = max(m, 1.0)
        c = float(r[r > 0].mean()) if (r > 0).any() else 3.5

        score = (v / (v + m)) * r + (m / (v + m)) * c

        score = np.where((v == 0) & (r == 0), 0.0, score)
        self.popularity = _minmax(score)

    def _fit_content(self, movies: pd.DataFrame) -> None:
        """One-hot thể loại + chuẩn hoá L2 từng dòng (notebook mục 16)."""
        split = movies["genres"].fillna("").apply(
            lambda s: [g.strip() for g in str(s).split("|") if g.strip()]
        )
        self.genre_names = sorted({g for lst in split for g in lst})

        if not self.genre_names:
            logger.warning("Không phim nào có thể loại -> tắt nhánh Content-based.")
            self.movie_genre_matrix = np.zeros((len(movies), 0), dtype=np.float32)
            return

        index = {g: i for i, g in enumerate(self.genre_names)}
        matrix = np.zeros((len(movies), len(self.genre_names)), dtype=np.float32)
        for row, genres in enumerate(split):
            for g in genres:
                matrix[row, index[g]] = 1.0

        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        self.movie_genre_matrix = matrix / np.where(norms == 0, 1.0, norms)

    def _fit_svd(
        self,
        rows: np.ndarray,
        cols: np.ndarray,
        vals: np.ndarray,
        n_users: int,
        n_movies: int,
    ) -> None:
        """
        Matrix Factorization bằng `svds` trên phần dư đã trừ trung bình
        theo user (notebook mục 17).

        Vì sao phải trừ trung bình trước: ma trận thưa mặc định coi ô trống
        là 0. Với thang điểm 1..5 thì 0 nghĩa là "cực ghét", trong khi thực
        tế nó chỉ là "chưa xem". Trừ trung bình biến ô trống thành "đúng
        bằng mức trung bình của user này" — giả định hợp lý hơn nhiều.
        """
        self.user_mean = np.full(n_users, self.global_mean, dtype=np.float64)
        sums = np.bincount(rows, weights=vals, minlength=n_users)
        counts = np.bincount(rows, minlength=n_users)
        nonzero = counts > 0
        self.user_mean[nonzero] = sums[nonzero] / counts[nonzero]

        too_small = (
            len(vals) < MIN_INTERACTIONS_FOR_SVD
            or n_users < MIN_USERS_FOR_SVD
            or n_movies < MIN_MOVIES_FOR_SVD
        )
        if too_small:
            logger.warning(
                "Dữ liệu quá ít (%d tương tác / %d user / %d phim) -> bỏ qua SVD. "
                "Gợi ý sẽ dựa vào Content + Popularity.",
                len(vals), n_users, n_movies,
            )
            self.u_sigma = None
            self.vt = None
            return

        k = min(self.svd_components, min(n_users, n_movies) - 1)
        if k < 1:
            self._disable_svd()
            return

        centered = vals - self.user_mean[rows]
        if np.abs(centered).max() < 1e-6:
            logger.info(
                "Mọi rating ngầm đều bằng nhau -> dùng SVD chế độ implicit "
                "(phân rã ma trận tương tác thô)."
            )
            matrix = csr_matrix((vals, (rows, cols)), shape=(n_users, n_movies))
            mode = "implicit"
        else:
            matrix = csr_matrix((centered, (rows, cols)), shape=(n_users, n_movies))
            mode = "centered"

        try:
            u, sigma, vt = svds(matrix, k=k)
        except Exception as exc:
            logger.warning("svds thất bại (%s) -> bỏ nhánh SVD.", exc)
            self._disable_svd()
            return

        order = np.argsort(sigma)[::-1]          # svds trả về theo thứ tự tăng dần
        self.u_sigma = (u[:, order] * sigma[order]).astype(np.float32)
        self.vt = vt[order, :].astype(np.float32)
        self.svd_mode = mode

    def _disable_svd(self) -> None:
        self.u_sigma = None
        self.vt = None
        self.svd_mode = "none"

    def _fit_user_profiles(self, interactions: pd.DataFrame, n_users: int) -> None:
        """
        Hồ sơ sở thích của user = trung bình có trọng số vector thể loại của
        các phim user đã đặt vé (notebook mục 16).
        """
        n_genres = len(self.genre_names)
        self.user_profiles = np.zeros((n_users, n_genres), dtype=np.float32)
        if n_genres == 0 or self.movie_genre_matrix is None:
            return

        for user_id, group in interactions.groupby("user_id"):
            u = self.user_to_idx[int(user_id)]
            positions = group["movie_id"].map(self.movie_to_idx).to_numpy()
            weights = group["rating"].to_numpy(dtype=np.float32)
            vectors = self.movie_genre_matrix[positions]
            if weights.sum() <= 0:
                continue
            profile = np.average(vectors, axis=0, weights=weights)
            norm = np.linalg.norm(profile)
            if norm > 0:
                self.user_profiles[u] = profile / norm

    # SUY LUẬN
    def recommend(self, user_id: int, top_n: int = 10) -> list[tuple[int, float]]:
        """
        Trả về [(movie_id, score), ...] đã sắp giảm dần theo điểm.

        User lạ (cold start) -> rơi về xếp hạng theo độ phổ biến. Đây là
        hành vi ĐÚNG chứ không phải lỗi: không có lịch sử thì không có gì
        để cá nhân hoá, trả về danh sách rỗng chỉ làm trang chủ trống hoác.
        """
        if len(self.movie_ids) == 0:
            return []

        idx = self.user_to_idx.get(int(user_id))
        if idx is None:
            return self._top_from(self.popularity.copy(), set(), top_n)

        scores = self._blend(idx)
        return self._top_from(scores, self.watched.get(int(user_id), set()), top_n)

    def _blend(self, user_idx: int) -> np.ndarray:
        n_movies = len(self.movie_ids)

        if self.u_sigma is not None and self.vt is not None:
            raw = self.u_sigma[user_idx] @ self.vt
            if self.svd_mode == "centered":
                raw = raw + self.user_mean[user_idx]
                svd_scores = np.clip((np.clip(raw, 1.0, 5.0) - 1.0) / 4.0, 0.0, 1.0)
            else:
                svd_scores = _minmax(raw)
            w_svd = self.weight_svd
        else:
            svd_scores = np.zeros(n_movies, dtype=np.float32)
            w_svd = 0.0

        if (
            self.user_profiles is not None
            and self.movie_genre_matrix is not None
            and self.movie_genre_matrix.shape[1] > 0
        ):
            profile = self.user_profiles[user_idx]
            content_scores = np.clip(self.movie_genre_matrix @ profile, 0.0, 1.0)
            w_content = self.weight_content
        else:
            content_scores = np.zeros(n_movies, dtype=np.float32)
            w_content = 0.0

        pop_scores = self.popularity if self.popularity.size else np.zeros(n_movies)

        total = w_svd + w_content + self.weight_popularity
        if total <= 0:
            return pop_scores.copy()

        return (
            w_svd * svd_scores
            + w_content * content_scores
            + self.weight_popularity * pop_scores
        ) / total

    def _top_from(
        self,
        scores: np.ndarray,
        exclude: set[int],
        top_n: int,
    ) -> list[tuple[int, float]]:
        if exclude:
            for movie_id in exclude:
                pos = self.movie_to_idx.get(int(movie_id))
                if pos is not None:
                    scores[pos] = -np.inf

        top_n = max(1, min(top_n, len(scores)))
        candidates = np.argpartition(-scores, top_n - 1)[:top_n]
        candidates = candidates[np.argsort(-scores[candidates])]

        return [
            (int(self.movie_ids[i]), float(scores[i]))
            for i in candidates
            if np.isfinite(scores[i])
        ]

    def known_user_ids(self) -> list[int]:
        return list(self.user_to_idx.keys())

    # LƯU / TẢI
    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        joblib.dump(self, tmp, compress=3)
        tmp.replace(path)
        logger.info("Đã lưu model: %s", path)

    @staticmethod
    def load(path: Path) -> "HybridRecommender":
        return joblib.load(path)
