# ============================================================
# Script de lancement - PFE D2F Enseignants
# ============================================================
# Prérequis : lancer d'abord l'infrastructure Docker :
#   docker compose up -d postgres rabbitmq redis
# Usage : .\launch-all.ps1
# ============================================================

$ROOT   = $PSScriptRoot
$PYTHON = "$ROOT\.venv\Scripts\python.exe"

# Charger les variables sensibles depuis .env si elles ne sont pas déjà définies.
function Import-EnvFile([string]$envFilePath) {
    if (-not (Test-Path $envFilePath)) {
        return
    }

    foreach ($line in Get-Content $envFilePath) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }

        $parts = $line.Split('=', 2)
        if ($parts.Count -ne 2) {
            continue
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim()

        if ($name -and -not (Test-Path "Env:$name")) {
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

Import-EnvFile (Join-Path $ROOT '.env')

if (-not $env:JWT_SECRET) {
    Write-Host "AVERTISSEMENT: JWT_SECRET absent. Exécutez .\scripts\generate-jwt-secret.ps1 ou renseignez .env avant de lancer les services." -ForegroundColor DarkYellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PFE D2F - Lancement des services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Helper : libérer un port (tue le processus qui l'occupe) ─────────────
function Clear-Port([int]$port) {
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

# ── [1/14] Vérifier Docker (infrastructure) ─────────────────────────────
Write-Host "`n[1/14] Vérification Docker (postgres / rabbitmq / redis)..." -ForegroundColor Yellow
try {
    $pg    = docker ps --filter name=d2f-postgres  --format "{{.Status}}" 2>$null
    $mq    = docker ps --filter name=d2f-rabbitmq  --format "{{.Status}}" 2>$null
    $redis = docker ps --filter name=d2f-redis     --format "{{.Status}}" 2>$null
    if ($pg) {
        Write-Host "  PostgreSQL : $pg" -ForegroundColor Green
    } else {
        Write-Host "  ERREUR: Container d2f-postgres absent — lancez: docker compose up -d postgres" -ForegroundColor Red
    }
    if ($mq) {
        Write-Host "  RabbitMQ   : $mq" -ForegroundColor Green
    } else {
        Write-Host "  AVERTISSEMENT: Container d2f-rabbitmq absent — les services de messagerie échoueront" -ForegroundColor DarkYellow
        Write-Host "  Lancez: docker compose up -d rabbitmq" -ForegroundColor DarkYellow
    }
    if ($redis) {
        Write-Host "  Redis      : $redis" -ForegroundColor Green
    } else {
        Write-Host "  AVERTISSEMENT: Container d2f-redis absent — le rate-limiting de la gateway échouera" -ForegroundColor DarkYellow
        Write-Host "  Lancez: docker compose up -d redis" -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "  AVERTISSEMENT: Docker non disponible - vérifiez que Docker est installé et en cours" -ForegroundColor DarkYellow
}

# ── [2-7/12] Microservices Java ──────────────────────────────────────────
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
    $svcPath = "$ROOT\$($svc.Dir)"
    if (Test-Path $svcPath) {
        Write-Host "`n[$step/14] Lancement $($svc.Name) (port $($svc.Port))..." -ForegroundColor Yellow
        Clear-Port $svc.Port
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$svcPath'; Write-Host 'Démarrage $($svc.Name) sur port $($svc.Port)...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run -DskipTests"
        Start-Sleep -Seconds 1
    } else {
        Write-Host "`n[$step/14] ERREUR: Répertoire $($svc.Name) introuvable à $svcPath" -ForegroundColor Red
    }
    $step++
}

# ── [8/12] API Gateway ──────────────────────────────────────────────────
Write-Host "`n[8/12] Lancement API Gateway (port 8080)..." -ForegroundColor Yellow
$apigwPath = "$ROOT\esprit_D2F-api-gateway"
if (Test-Path $apigwPath) {
    Clear-Port 8080
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Location '$apigwPath'; Write-Host 'Démarrage API Gateway sur port 8080...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run -DskipTests"
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-api-gateway introuvable" -ForegroundColor Red
}

# ── [9/12] RICE Service (Python + NLP) ──────────────────────────────────
Write-Host "`n[9/12] Lancement RICE Service (port 8001)..." -ForegroundColor Yellow
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
        Clear-Port 8001
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$ricePath'; `$env:TESSERACT_CMD='$tessExe'; `$env:TESSDATA_PREFIX='$tessData'; Write-Host 'Démarrage RICE Service sur port 8001 (NLP + OCR)...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn main:app --host 0.0.0.0 --port 8001"
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-rice introuvable" -ForegroundColor Red
}

# ── [10/12] Predictive Analytics Service (Python/FastAPI) ────────────────
Write-Host "`n[10/12] Lancement Predictive Analytics Service (port 8090)..." -ForegroundColor Yellow
$predictivePath = "$ROOT\esprit_D2F-predictive-analytics"
if (Test-Path $predictivePath) {
    if (-not (Test-Path $PYTHON)) {
        Write-Host "  ERREUR: virtualenv Python introuvable à $PYTHON" -ForegroundColor Red
    } else {
        Clear-Port 8090
        Start-Process powershell -ArgumentList "-NoExit", "-Command", `
            "Set-Location '$predictivePath'; Write-Host 'Démarrage Predictive Analytics Service sur port 8090...' -ForegroundColor Cyan; & '$PYTHON' -m uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload"
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  ERREUR: Répertoire esprit_D2F-predictive-analytics introuvable" -ForegroundColor Red
}

# ── [11/12] Frontend React ───────────────────────────────────────────────
Write-Host "`n[11/12] Lancement Frontend (port 5173)..." -ForegroundColor Yellow
$webappPath = "$ROOT\esprit_D2F-webapp"
if (Test-Path $webappPath) {
    Clear-Port 5173
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
Write-Host "  API Gateway:      http://localhost:8080"
Write-Host "  RICE Service:     http://localhost:8001  (NLP + OCR)"
Write-Host "  Predictive-Analytics: http://localhost:8090  (scikit-learn FastAPI)"
Write-Host "  Frontend:         http://localhost:5173"
Write-Host "  Artemis Console:  http://localhost:8161"
