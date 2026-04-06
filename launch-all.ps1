# ============================================================
# Script de lancement - PFE D2F Enseignants
# ============================================================
# Prérequis : Docker containers d2f-postgres et d2f-artemis en cours
# Usage : .\launch-all.ps1
# ============================================================

$ROOT   = $PSScriptRoot
$PYTHON = "$ROOT\.venv\Scripts\python.exe"
$JWT_SECRET = "d2f-dev-secret-minimum-64-chars-do-not-use-in-production-1234567890"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PFE D2F - Lancement des services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Helper : libérer un port (tue le processus qui l'occupe) ─────────────
function Free-Port([int]$port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  Port $port libéré (tué PID $($c.OwningProcess): $($proc.Name))" -ForegroundColor DarkGray
        }
    }
}

# ── [1/11] Vérifier Docker ───────────────────────────────────────────────
Write-Host "`n[1/11] Vérification Docker..." -ForegroundColor Yellow
$pg = docker ps --filter name=d2f-postgres --format "{{.Status}}" 2>$null
$mq = docker ps --filter name=d2f-artemis  --format "{{.Status}}" 2>$null
if (-not $pg) { Write-Host "  ERREUR: Container d2f-postgres non trouvé!" -ForegroundColor Red; exit 1 }
if (-not $mq) { Write-Host "  ERREUR: Container d2f-artemis non trouvé!"  -ForegroundColor Red; exit 1 }
Write-Host "  PostgreSQL: $pg" -ForegroundColor Green
Write-Host "  ActiveMQ:   $mq" -ForegroundColor Green

# ── [2-7/11] Microservices Java ──────────────────────────────────────────
$services = @(
    @{ Name = "Auth";             Dir = "esprit_D2F-authentification";  Port = 8085 },
    @{ Name = "Formation";        Dir = "esprit_D2F-formation";         Port = 8088 },
    @{ Name = "Certificat";       Dir = "esprit_D2F-certificat";        Port = 8086 },
    @{ Name = "Evaluation";       Dir = "esprit_D2F-evaluation";        Port = 8087 },
    @{ Name = "Besoin-Formation"; Dir = "esprit_D2F-besoin-formation";  Port = 8004 },
    @{ Name = "Competence";       Dir = "esprit_D2F-competence";        Port = 8005 }
)

$step = 2
foreach ($svc in $services) {
    Write-Host "`n[$step/11] Lancement $($svc.Name) (port $($svc.Port))..." -ForegroundColor Yellow
    Free-Port $svc.Port
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Location '$ROOT\$($svc.Dir)'; `$env:JWT_SECRET='$JWT_SECRET'; Write-Host 'Démarrage $($svc.Name) sur port $($svc.Port)...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
    Start-Sleep -Seconds 2
    $step++
}

# ── [8/11] API Gateway ───────────────────────────────────────────────────
Write-Host "`n[8/11] Lancement API Gateway (port 8222)..." -ForegroundColor Yellow
Free-Port 8222
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$ROOT\esprit_D2F-api-gateway'; `$env:JWT_SECRET='$JWT_SECRET'; Write-Host 'Démarrage API Gateway sur port 8222...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 2

# ── [9/11] AI Reco Service (Python) ─────────────────────────────────────
Write-Host "`n[9/11] Lancement AI Reco Service (port 8000)..." -ForegroundColor Yellow
Free-Port 8000
if (-not (Test-Path $PYTHON)) {
    Write-Host "  ERREUR: virtualenv Python introuvable à $PYTHON" -ForegroundColor Red
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Location '$ROOT\esprit_D2F-recommandation-formateur'; Write-Host 'Démarrage AI Reco Service sur port 8000 (hot-reload activé)...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn ai_reco:app --host 0.0.0.0 --port 8000 --reload"
    Start-Sleep -Seconds 2
}

# ── [10/11] RICE Service (Python) ────────────────────────────────────────
Write-Host "`n[10/11] Lancement RICE Service (port 8001)..." -ForegroundColor Yellow
Free-Port 8001
if (-not (Test-Path $PYTHON)) {
    Write-Host "  ERREUR: virtualenv Python introuvable à $PYTHON" -ForegroundColor Red
} else {
    # Tesseract OCR paths (scanned PDF support) – auto-detect from common locations
    $tessExe  = "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
    $tessData = "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tessdata"
    if (-not (Test-Path $tessExe)) { $tessExe  = "C:\Program Files\Tesseract-OCR\tesseract.exe" }
    if (-not (Test-Path $tessExe)) { $tessExe  = "" }
    if ($tessExe) {
        Write-Host "  Tesseract OCR détecté: $tessExe" -ForegroundColor Green
    } else {
        Write-Host "  AVERTISSEMENT: Tesseract non trouvé – PDFs scannés non supportés" -ForegroundColor DarkYellow
    }
    $riceCmd = "Set-Location '$ROOT\esprit_D2F-rice'; `$env:TESSERACT_CMD='$tessExe'; `$env:TESSDATA_PREFIX='$tessData'; Write-Host 'Démarrage RICE Service sur port 8001 (mode regex/table NER, hot-reload activé)...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $riceCmd
    Start-Sleep -Seconds 2
}

# ── [11/11] Frontend React ───────────────────────────────────────────────
Write-Host "`n[11/11] Lancement Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$ROOT\esprit_D2F-webapp'; Write-Host 'Démarrage Frontend...' -ForegroundColor Cyan; npm install --legacy-peer-deps; npm run dev"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Tous les services démarrent dans"      -ForegroundColor Green
Write-Host "  des fenêtres séparées!"                -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nServices:" -ForegroundColor White
Write-Host "  Auth:             http://localhost:8085"
Write-Host "  Formation:        http://localhost:8088"
Write-Host "  Certificat:       http://localhost:8086"
Write-Host "  Evaluation:       http://localhost:8087"
Write-Host "  Besoin-Formation: http://localhost:8004"
Write-Host "  Competence:       http://localhost:8005"
Write-Host "  API Gateway:      http://localhost:8222"
Write-Host "  AI Reco:          http://localhost:8000"
Write-Host "  RICE Service:     http://localhost:8001  (regex + table NER)"
Write-Host "  Frontend:         http://localhost:5173"
Write-Host "  Artemis Console:  http://localhost:8161"
