"""
Cấu hình recommendation-service.

Mọi giá trị đều đọc từ biến môi trường (file .env), KHÔNG hardcode.
Lý do: service này chạy ở 3 nơi khác nhau — máy dev (SQL Server local),
Docker Compose (host là tên container `sqlserver`), và máy chấm đồ án của
giảng viên. Hardcode `localhost` là hỏng ngay ở nơi thứ hai.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

# Thư mục gốc của service (chứa main.py, train.py, .env)
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _get_int(name: str, default: int) -> int:
    raw = _get(name)
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    raw = _get(name)
    try:
        return float(raw) if raw else default
    except ValueError:
        return default


class Settings:
    """Gom toàn bộ cấu hình vào một chỗ."""

    # --- HTTP ---------------------------------------------------------
    host: str = _get("HOST", "0.0.0.0")
    port: int = _get_int("PORT", 8000)

    # --- Database -----------------------------------------------------
    db_host: str = _get("DB_HOST", "localhost")
    db_port: int = _get_int("DB_PORT", 1433)
    db_user: str = _get("DB_USERNAME", "sa")
    db_password: str = _get("DB_PASSWORD", "")
    db_name: str = _get("DB_DATABASE", "CineHuntDB")
    # Named instance (VD: SQLEXPRESS). Để trống nếu dùng default instance.
    db_instance: str = _get("DB_INSTANCE", "")
    # "pyodbc" (mặc định) hoặc "pymssql"
    db_connector: str = _get("DB_CONNECTOR", "pyodbc").lower()
    db_odbc_driver: str = _get("DB_ODBC_DRIVER", "ODBC Driver 17 for SQL Server")

    # --- Model --------------------------------------------------------
    model_dir: Path = BASE_DIR / _get("MODEL_DIR", "model")
    model_file: str = _get("MODEL_FILE", "recommender.joblib")
    model_version: str = _get("MODEL_VERSION", "v7-hybrid")

    # Trọng số Hybrid — lấy đúng BEST_HYBRID_WEIGHTS của notebook v7.
    weight_svd: float = _get_float("WEIGHT_SVD", 0.6)
    weight_content: float = _get_float("WEIGHT_CONTENT", 0.3)
    weight_popularity: float = _get_float("WEIGHT_POPULARITY", 0.1)

    # Số chiều tiềm ẩn của SVD. 50 hợp lý với dữ liệu cỡ đồ án; notebook
    # chọn K tốt nhất trong [20, 50, 100] bằng validation.
    svd_components: int = _get_int("SVD_COMPONENTS", 50)

    # Số phim tối đa lưu vào bảng cache movie_recommendations cho mỗi user.
    top_n_cache: int = _get_int("TOP_N_CACHE", 30)

    # Chỉ tính là "đã xem" khi đơn ở các trạng thái này.
    positive_booking_statuses: tuple[str, ...] = tuple(
        s.strip().upper()
        for s in _get("POSITIVE_BOOKING_STATUSES", "PAID,ISSUED").split(",")
        if s.strip()
    )

    @property
    def model_path(self) -> Path:
        return self.model_dir / self.model_file

    def sqlalchemy_url(self) -> str:
        """
        Chuỗi kết nối SQLAlchemy.

        LƯU Ý mật khẩu: password của SQL Server hay có ký tự `@`, `#`, `/`.
        Không quote_plus thì SQLAlchemy parse sai URL và báo lỗi rất khó hiểu
        ("Could not parse rfc1738 URL"). Đây là lỗi kinh điển khi kết nối
        mssql, nên bọc quote_plus cho cả user lẫn password.
        """
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)

        if self.db_connector == "pymssql":
            # pymssql KHÔNG hỗ trợ named instance qua URL -> phải dùng cổng.
            return (
                f"mssql+pymssql://{user}:{password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8"
            )

        # pyodbc
        server = self.db_host
        if self.db_instance:
            # Named instance: dùng dạng HOST\INSTANCE, KHÔNG kèm cổng
            # (SQL Browser tự phân giải cổng động).
            server = f"{self.db_host}\\{self.db_instance}"
        else:
            server = f"{self.db_host},{self.db_port}"

        params = quote_plus(
            f"DRIVER={{{self.db_odbc_driver}}};"
            f"SERVER={server};"
            f"DATABASE={self.db_name};"
            f"UID={self.db_user};"
            f"PWD={self.db_password};"
            # Giống hệt app.module.ts của NestJS: SQL Server cài local dùng
            # self-signed cert, không bật cái này thì driver từ chối kết nối
            # trên Linux/Docker và chỉ báo "login timeout".
            "TrustServerCertificate=yes;"
            "Encrypt=no;"
        )
        return f"mssql+pyodbc:///?odbc_connect={params}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
