# ============================================================
# Script de lancement - PFE D2F Enseignants
# ============================================================
# Prérequis : Docker containers d2f-postgres et d2f-artemis en cours
# Usage : .\launch-all.ps1
# ============================================================

$ROOT = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PFE D2F - Lancement des services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Vérifier Docker
Write-Host "`n[1/9] Vérification Docker..." -ForegroundColor Yellow
$pg = docker ps --filter name=d2f-postgres --format "{{.Status}}" 2>$null
$mq = docker ps --filter name=d2f-artemis --format "{{.Status}}" 2>$null
if (-not $pg) { Write-Host "  ERREUR: Container d2f-postgres non trouvé!" -ForegroundColor Red; exit 1 }
if (-not $mq) { Write-Host "  ERREUR: Container d2f-artemis non trouvé!" -ForegroundColor Red; exit 1 }
Write-Host "  PostgreSQL: $pg" -ForegroundColor Green
Write-Host "  ActiveMQ:   $mq" -ForegroundColor Green

# Lancer les microservices Java
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
    Write-Host "`n[$step/9] Lancement $($svc.Name) (port $($svc.Port))..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\$($svc.Dir)'; Write-Host 'Démarrage $($svc.Name) sur port $($svc.Port)...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
    Start-Sleep -Seconds 2
    $step++
}

# API Gateway
Write-Host "`n[8/9] Lancement API Gateway (port 8222)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\esprit_D2F-api-gateway'; Write-Host 'Démarrage API Gateway sur port 8222...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 2

# Frontend
Write-Host "`n[9/9] Lancement Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\esprit_D2F-webapp'; Write-Host 'Démarrage Frontend...' -ForegroundColor Cyan; npm install --legacy-peer-deps; npm run dev"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Tous les services sont en cours de" -ForegroundColor Green
Write-Host "  démarrage dans des fenêtres séparées!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nServices:" -ForegroundColor White
Write-Host "  Auth:             http://localhost:8085"
Write-Host "  Formation:        http://localhost:8088"
Write-Host "  Certificat:       http://localhost:8086"
Write-Host "  Evaluation:       http://localhost:8087"
Write-Host "  Besoin-Formation: http://localhost:8004"
Write-Host "  Competence:       http://localhost:8005"
Write-Host "  API Gateway:      http://localhost:8222"
Write-Host "  Frontend:         http://localhost:5173"
Write-Host "  Artemis Console:  http://localhost:8161"
