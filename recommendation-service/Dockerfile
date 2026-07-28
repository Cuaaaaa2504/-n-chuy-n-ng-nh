# ============================================================
# recommendation-service — image production
#
# Build:  docker build -t cinehunt-recommendation .
# Run:    docker run --env-file .env -p 8000:8000 cinehunt-recommendation
# ============================================================

FROM python:3.12-slim

# Không ghi file .pyc và không đệm stdout — nếu đệm thì log của uvicorn chỉ
# hiện ra khi container chết, `docker logs` lúc đang chạy sẽ trống trơn.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ------------------------------------------------------------------
# ODBC Driver 18 for SQL Server.
# Image python:3.12-slim dựa trên Debian và KHÔNG có sẵn driver này —
# thiếu nó thì pyodbc báo "Can't open lib 'ODBC Driver 17 for SQL Server'"
# ngay khi kết nối, dù pip install pyodbc đã thành công.
# ------------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl gnupg ca-certificates \
 && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
      | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
      > /etc/apt/sources.list.d/mssql-release.list \
 && apt-get update \
 && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc \
 && apt-get purge -y gnupg \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

# Trong container dùng driver 18 (bản 17 không có trong repo Debian 12).
ENV DB_ODBC_DRIVER="ODBC Driver 18 for SQL Server"

# Copy requirements trước rồi mới copy code: sửa một dòng Python không làm
# Docker cài lại toàn bộ thư viện.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY train.py .

# Chạy bằng user thường, không phải root.
RUN useradd --create-home --shell /bin/bash appuser \
 && mkdir -p /app/model \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
