#!/usr/bin/env bash
#
# FIX REC-01 — Python recommendation service không tự chạy.
#
# Vấn đề gốc: NestJS gọi http://localhost:8000/recommend/{userId}, nhưng tiến
# trình ở cổng 8000 là một chương trình Python HOÀN TOÀN ĐỘC LẬP. Không có gì
# khởi động nó cùng NestJS, và khi nó không chạy thì NestJS âm thầm rơi về
# fallback popularity — trang chủ vẫn đầy phim nên không ai nhận ra.
#
# Script này khởi động cả ba tiến trình và, quan trọng hơn, KIỂM TRA rồi báo
# rõ ràng nếu có phần nào không lên được.
#
# Dùng:
#     chmod +x start-all.sh
#     ./start-all.sh
#
# Dừng tất cả: Ctrl+C (script tự dọn các tiến trình con).

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/San Ve Backend3/cinehunt-backend"
FRONTEND_DIR="$ROOT_DIR/San Ve Frontend/San Ve Frontend/frontend1"
REC_DIR="$ROOT_DIR/recommendation-service"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()  { echo -e "${YELLOW}[!]${NC}    $*"; }
fail()  { echo -e "${RED}[LỖI]${NC} $*"; }

PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "$PYTHON_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then PYTHON_BIN=python3; else PYTHON_BIN=python; fi
fi

PIDS=()
cleanup() {
  echo ""
  echo "Đang dừng tất cả tiến trình..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ---------------------------------------------------------------------------
# 0. Kiểm tra cấu hình trước khi khởi động
#
# Thà dừng ngay ở đây với một thông báo rõ ràng, còn hơn để ba service cùng
# chạy rồi lỗi rải rác ở ba cửa sổ log khác nhau.
# ---------------------------------------------------------------------------
if [ ! -f "$BACKEND_DIR/.env" ]; then
  fail "Thiếu $BACKEND_DIR/.env"
  echo "     Chạy:  cp \"$BACKEND_DIR/.env.example\" \"$BACKEND_DIR/.env\"  rồi điền thông tin SQL Server."
  exit 1
fi

if ! grep -q '^GEMINI_API_KEY=.\+' "$BACKEND_DIR/.env"; then
  warn "Chưa có GEMINI_API_KEY trong .env -> chatbot sẽ không trả lời được (CHAT-04)."
  warn "Lấy key miễn phí tại https://aistudio.google.com/apikey"
fi

if [ ! -f "$REC_DIR/model/recommender.joblib" ]; then
  warn "Chưa có file model (REC-02). Service gợi ý sẽ chạy ở chế độ popularity."
  warn "Tạo model bằng:  cd recommendation-service && "$PYTHON_BIN" train.py"
fi

# ---------------------------------------------------------------------------
# 1. Recommendation service (Python) — khởi động TRƯỚC
#
# NestJS ping /health ngay lúc boot (RecommendationScheduler). Nếu Python lên
# sau thì lần kiểm tra đầu tiên luôn thất bại và log đầy cảnh báo giả.
# ---------------------------------------------------------------------------
echo "==> Khởi động recommendation-service (cổng 8000)..."
(
  cd "$REC_DIR" || exit 1
  if [ -d ".venv" ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
  fi
  exec "$PYTHON_BIN" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) &
PIDS+=($!)

# Đợi service sẵn sàng, tối đa 30 giây.
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    info "recommendation-service đã sẵn sàng."
    curl -s http://localhost:8000/health | head -c 400; echo ""
    break
  fi
  if [ "$i" -eq 30 ]; then
    fail "recommendation-service không lên sau 30 giây."
    fail "Kiểm tra: cd recommendation-service && "$PYTHON_BIN" -m pip install -r requirements.txt"
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 2. Backend NestJS (cổng 3000)
# ---------------------------------------------------------------------------
echo "==> Khởi động cinehunt-backend (cổng 3000)..."
(
  cd "$BACKEND_DIR" || exit 1
  [ -d node_modules ] || npm install
  exec npm run start:dev
) &
PIDS+=($!)

# ---------------------------------------------------------------------------
# 3. Frontend Vite (cổng 5173)
# ---------------------------------------------------------------------------
echo "==> Khởi động frontend (cổng 5173)..."
(
  cd "$FRONTEND_DIR" || exit 1
  [ -f .env ] || { [ -f .env.example ] && cp .env.example .env; }
  [ -d node_modules ] || npm install
  exec npm run dev
) &
PIDS+=($!)

echo ""
info "Tất cả đã khởi động:"
echo "     Frontend  : http://localhost:5173"
echo "     Backend   : http://localhost:3000   (Swagger: /api)"
echo "     Gợi ý phim: http://localhost:8000/health"
echo ""
echo "Nhấn Ctrl+C để dừng tất cả."

wait
