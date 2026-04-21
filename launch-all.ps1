# ============================================================
# Script de lancement - PFE D2F Enseignants
# ============================================================
# Prérequis : Docker containers d2f-postgres et d2f-artemis en cours
# Usage : .\launch-all.ps1
# ============================================================

$ROOT   = $PSScriptRoot
$PYTHON = "$ROOT\.venv\Scripts\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PFE D2F - Lancement des services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Helper : libérer un port (tue le processus qui l'occupe) ─────────────
function Free-Port([int]$port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Port $port libéré (tué PID $($c.OwningProcess): $($proc.Name))" -ForegroundColor DarkGray
            }
        }
    } catch {
        Write-Host "  AVERTISSEMENT: Impossible de vérifier le port $port" -ForegroundColor DarkYellow
    }
}

# ── [1/13] Vérifier Docker ───────────────────────────────────────────────
Write-Host "`n[1/13] Vérification Docker..." -ForegroundColor Yellow
try {
    $pg = docker ps --filter name=d2f-postgres --format "{{.Status}}" 2>$null
    $mq = docker ps --filter name=d2f-artemis  --format "{{.Status}}" 2>$null
    if ($pg) {
        Write-Host "  PostgreSQL: $pg" -ForegroundColor Green
    } else {
        Write-Host "  AVERTISSEMENT: Container d2f-postgres non trouvé - assurez-vous qu'il soit en cours!" -ForegroundColor DarkYellow
    }
    if ($mq) {
        Write-Host "  ActiveMQ:   $mq" -ForegroundColor Green
    } else {
        Write-Host "  AVERTISSEMENT: Container d2f-artemis non trouvé - assurez-vous qu'il soit en cours!" -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "  AVERTISSEMENT: Docker non disponible - vérifiez que Docker est installé et en cours" -ForegroundColor DarkYellow
}

# ── [2/13] Vérifier / démarrer Ollama ───────────────────────────────────
Write-Host "`n[2/13] Vérification Ollama (LLM local)..." -ForegroundColor Yellow
$ollamaRunning = Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue
if ($ollamaRunning) {
    Write-Host "  Ollama déjà actif sur le port 11434" -ForegroundColor Green
} else {
    $ollamaExe = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaExe) {
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 4
        if (Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue) {
            Write-Host "  Ollama démarré (mistral disponible)" -ForegroundColor Green
        } else {
            Write-Host "  AVERTISSEMENT: Ollama n'a pas démarré (fallback regex activé)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  AVERTISSEMENT: ollama non installé (https://ollama.com/download)" -ForegroundColor DarkYellow
    }
}

# ── [3-9/13] Microservices Java ──────────────────────────────────────────
$services = @(
    @{ Name = "Auth";             Dir = "esprit_D2F-authentification";  Port = 8085 },
    @{ Name = "Formation";        Dir = "esprit_D2F-formation";         Port = 8088 },
    @{ Name = "Certificat";       Dir = "esprit_D2F-certificat";        Port = 8086 },
    @{ Name = "Evaluation";       Dir = "esprit_D2F-evaluation";        Port = 8087 },
    @{ Name = "Besoin-Formation"; Dir = "esprit_D2F-besoin-formation";  Port = 8004 },
    @{ Name = "Competence";       Dir = "esprit_D2F-competence";        Port = 8005 },
    @{ Name = "Analyse";          Dir = "esprit_D2F-analyse";            Port = 8089 }
)

$step = 3
foreach ($svc in $services) {
    $svcPath = "$ROOT\$($svc.Dir)"
    if (Test-Path $svcPath) {
        Write-Host "`n[$step/13] Lancement $($svc.Name) (port $($svc.Port))..." -ForegroundColor Yellow
        Free-Port $svc.Port
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$svcPath'; Write-Host 'Démarrage $($svc.Name) sur port $($svc.Port)...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run -DskipTests"
        Start-Sleep -Seconds 1
    } else {
        Write-Host "`n[$step/13] ERREUR: Répertoire $($svc.Name) introuvable à $svcPath" -ForegroundColor Red
    }
    $step++
}

# ── [10/13] API Gateway ──────────────────────────────────────────────────
Write-Host "`n[10/13] Lancement API Gateway (port 8222)..." -ForegroundColor Yellow
$apigwPath = "$ROOT\esprit_D2F-api-gateway"
if (Test-Path $apigwPath) {
    Free-Port 8222
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Location '$apigwPath'; Write-Host 'Démarrage API Gateway sur port 8222...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run -DskipTests"
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-api-gateway introuvable" -ForegroundColor Red
}

# ── [11/13] AI Reco Service (Python) ────────────────────────────────────
Write-Host "`n[11/13] Lancement AI Reco Service (port 8000)..." -ForegroundColor Yellow
$aiRecoPath = "$ROOT\esprit_D2F-recommandation-formateur"
if (Test-Path $aiRecoPath) {
    if (-not (Test-Path $PYTHON)) {
        Write-Host "  ERREUR: virtualenv Python introuvable à $PYTHON" -ForegroundColor Red
    } else {
        Free-Port 8000
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$aiRecoPath'; Write-Host 'Démarrage AI Reco Service sur port 8000...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn ai_reco:app --host 0.0.0.0 --port 8000"
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-recommandation-formateur introuvable" -ForegroundColor Red
}

# ── [12/13] RICE Service (Python + Ollama LLM) ───────────────────────────
Write-Host "`n[12/13] Lancement RICE Service (port 8001)..." -ForegroundColor Yellow
$ricePath = "$ROOT\esprit_D2F-rice"
if (Test-Path $ricePath) {
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
        Free-Port 8001
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$ricePath'; `$env:TESSERACT_CMD='$tessExe'; `$env:TESSDATA_PREFIX='$tessData'; Write-Host 'Démarrage RICE Service sur port 8001 (LLM: mistral)...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn main:app --host 0.0.0.0 --port 8001"
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-rice introuvable" -ForegroundColor Red
}

# ── [13/13] Frontend React ───────────────────────────────────────────────
Write-Host "`n[13/13] Lancement Frontend (port 5173)..." -ForegroundColor Yellow
$webappPath = "$ROOT\esprit_D2F-webapp"
if (Test-Path $webappPath) {
    Free-Port 5173
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Location '$webappPath'; Write-Host 'Vérification des dépendances npm...' -ForegroundColor Cyan; npm install --legacy-peer-deps 2>&1 | Out-Null; Write-Host 'Démarrage Frontend...' -ForegroundColor Cyan; npm run dev"
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-webapp introuvable" -ForegroundColor Red
}

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
Write-Host "  Analyse:          http://localhost:8089"
Write-Host "  API Gateway:      http://localhost:8222"
Write-Host "  AI Reco:          http://localhost:8000"
Write-Host "  RICE Service:     http://localhost:8001  (Ollama mistral)"
Write-Host "  Frontend:         http://localhost:5173"
Write-Host "  Artemis Console:  http://localhost:8161"
