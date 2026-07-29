# FIX REC-01 — Python recommendation service không tự chạy (bản Windows).
#
# Xem giải thích đầy đủ trong start-all.sh.
#
# Dùng (PowerShell, tại thư mục gốc repo):
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#     .\start-all.ps1
#
# Mỗi service mở trong một cửa sổ PowerShell riêng để log không lẫn vào nhau.

$ErrorActionPreference = "Stop"

$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root "San Ve Backend3\cinehunt-backend"
$FrontendDir = Join-Path $Root "San Ve Frontend\San Ve Frontend\frontend1"
$RecDir      = Join-Path $Root "recommendation-service"

function Write-Ok   ($m) { Write-Host "[OK]   $m"  -ForegroundColor Green }
function Write-Warn ($m) { Write-Host "[!]    $m"  -ForegroundColor Yellow }
function Write-Err  ($m) { Write-Host "[LOI]  $m"  -ForegroundColor Red }

# --- 0. Kiểm tra cấu hình ---------------------------------------------------
$backendEnv = Join-Path $BackendDir ".env"
if (-not (Test-Path $backendEnv)) {
    Write-Err "Thieu $backendEnv"
    Write-Host "       Chay:  Copy-Item `"$BackendDir\.env.example`" `"$backendEnv`""
    exit 1
}

if (-not (Select-String -Path $backendEnv -Pattern '^GEMINI_API_KEY=.+' -Quiet)) {
    Write-Warn "Chua co GEMINI_API_KEY trong .env -> chatbot khong tra loi duoc (CHAT-04)."
    Write-Warn "Lay key mien phi tai https://aistudio.google.com/apikey"
}

if (-not (Test-Path (Join-Path $RecDir "model\recommender.joblib"))) {
    Write-Warn "Chua co file model (REC-02). Goi y se chay o che do popularity."
    Write-Warn "Tao model:  cd recommendation-service; python train.py"
}

# --- 1. Recommendation service (khoi dong TRUOC) ----------------------------
Write-Host "==> Khoi dong recommendation-service (cong 8000)..."
$recCmd = if (Test-Path (Join-Path $RecDir ".venv\Scripts\Activate.ps1")) {
    ".\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
} else {
    "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RecDir'; $recCmd"

# Doi service san sang, toi da 30 giay.
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2
        Write-Ok "recommendation-service da san sang (modelLoaded = $($res.modelLoaded))."
        if (-not $res.modelLoaded) { Write-Warn $res.effect }
        $ready = $true
        break
    } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) {
    Write-Err "recommendation-service khong len sau 30 giay."
    Write-Err "Kiem tra: cd recommendation-service; pip install -r requirements.txt"
}

# --- 2. Backend NestJS ------------------------------------------------------
Write-Host "==> Khoi dong cinehunt-backend (cong 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$BackendDir'; if (-not (Test-Path node_modules)) { npm install }; npm run start:dev"

# --- 3. Frontend Vite -------------------------------------------------------
Write-Host "==> Khoi dong frontend (cong 5173)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$FrontendDir'; if (-not (Test-Path .env)) { if (Test-Path .env.example) { Copy-Item .env.example .env } }; if (-not (Test-Path node_modules)) { npm install }; npm run dev"

Write-Host ""
Write-Ok "Tat ca da khoi dong:"
Write-Host "       Frontend  : http://localhost:5173"
Write-Host "       Backend   : http://localhost:3000   (Swagger: /api)"
Write-Host "       Goi y phim: http://localhost:8000/health"
Write-Host ""
Write-Host "Dong tung cua so PowerShell de dung tung service."
