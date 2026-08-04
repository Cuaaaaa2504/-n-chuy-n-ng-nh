"""
Cấu hình recommendation-service.

Mọi giá trị đều đọc từ biến môi trường (file .env), KHÔNG hardcode.
Lý do: service này chạy ở 3 nơi khác nhau — máy dev (SQL Server local),
Docker Compose (host là tên container `sqlserver`), và máy chấm đồ án của
giảng viên. Hardcode `localhost` là hỏng ngay ở nơi thứ hai.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent


def _candidate_backend_envs() -> list[Path]:
    """Các vị trí có thể chứa .env của cinehunt-backend."""
    explicit = os.getenv("BACKEND_ENV_PATH", "").strip()
    paths = [Path(explicit)] if explicit else []
    repo_root = BASE_DIR.parent
    paths += [
        repo_root / "San Ve Backend3" / "cinehunt-backend" / ".env",
        repo_root / "cinehunt-backend" / ".env",
        BASE_DIR.parent / ".." / "cinehunt-backend" / ".env",
    ]
    return paths


load_dotenv(BASE_DIR / ".env")

_INHERITED_FROM_BACKEND: str | None = None
for _candidate in _candidate_backend_envs():
    try:
        if _candidate.is_file():
            load_dotenv(_candidate, override=False)
            _INHERITED_FROM_BACKEND = str(_candidate.resolve())
            break
    except OSError:
        continue


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

    # HTTP
    host: str = _get("HOST", "0.0.0.0")
    port: int = _get_int("PORT", 8000)

    # Database
    db_host: str = _get("DB_HOST", "localhost")
    db_port: int = _get_int("DB_PORT", 1433)
    db_user: str = _get("DB_USERNAME", "sa")
    db_password: str = _get("DB_PASSWORD", "")
    db_name: str = _get("DB_DATABASE", "CineHuntDB")
    db_instance: str = _get("DB_INSTANCE", "")
    db_connector: str = _get("DB_CONNECTOR", "pyodbc").lower()
    db_odbc_driver: str = _get("DB_ODBC_DRIVER", "ODBC Driver 17 for SQL Server")

    # Model
    model_dir: Path = BASE_DIR / _get("MODEL_DIR", "model")
    model_file: str = _get("MODEL_FILE", "recommender.joblib")
    model_version: str = _get("MODEL_VERSION", "v7-hybrid")

    weight_svd: float = _get_float("WEIGHT_SVD", 0.6)
    weight_content: float = _get_float("WEIGHT_CONTENT", 0.3)
    weight_popularity: float = _get_float("WEIGHT_POPULARITY", 0.1)

    svd_components: int = _get_int("SVD_COMPONENTS", 50)

    top_n_cache: int = _get_int("TOP_N_CACHE", 30)

    positive_booking_statuses: tuple[str, ...] = tuple(
        s.strip().upper()
        for s in _get("POSITIVE_BOOKING_STATUSES", "PAID,ISSUED").split(",")
        if s.strip()
    )

    inherited_backend_env: str | None = _INHERITED_FROM_BACKEND

    @property
    def model_path(self) -> Path:
        return self.model_dir / self.model_file

    def _available_odbc_drivers(self) -> list[str]:
        try:
            import pyodbc

            return list(pyodbc.drivers())
        except Exception:
            return []

    def resolve_connector(self) -> str:
        """Connector thực sự dùng được trên máy này ('pyodbc' | 'pymssql')."""
        if self.db_connector == "pymssql":
            return "pymssql"

        if self.resolve_odbc_driver() is None:
            logger.warning(
                "Không tìm thấy ODBC Driver nào cho SQL Server trên máy này. "
                "Tự động chuyển sang pymssql. Muốn dùng pyodbc thì cài "
                "'ODBC Driver 18 for SQL Server' rồi đặt lại DB_CONNECTOR=pyodbc."
            )
            return "pymssql"

        return "pyodbc"

    def resolve_odbc_driver(self) -> str | None:
        drivers = self._available_odbc_drivers()
        if not drivers:
            return None

        if self.db_odbc_driver in drivers:
            return self.db_odbc_driver

        sql_drivers = sorted(
            (d for d in drivers if "SQL Server" in d), reverse=True
        )
        if sql_drivers:
            logger.warning(
                "DB_ODBC_DRIVER=%r chưa được cài. Dùng tạm %r. "
                "Cập nhật lại .env để tránh bất ngờ.",
                self.db_odbc_driver,
                sql_drivers[0],
            )
            return sql_drivers[0]

        return None

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
        connector = self.resolve_connector()

        if connector == "pymssql":
            return (
                f"mssql+pymssql://{user}:{password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8"
            )

        server = self.db_host
        if self.db_instance:
            server = f"{self.db_host}\\{self.db_instance}"
        else:
            server = f"{self.db_host},{self.db_port}"

        driver = self.resolve_odbc_driver() or self.db_odbc_driver
        params = quote_plus(
            f"DRIVER={{{driver}}};"
            f"SERVER={server};"
            f"DATABASE={self.db_name};"
            f"UID={self.db_user};"
            f"PWD={self.db_password};"
            "TrustServerCertificate=yes;"
            "Encrypt=no;"
        )
        return f"mssql+pyodbc:///?odbc_connect={params}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
