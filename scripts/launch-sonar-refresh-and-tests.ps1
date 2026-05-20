# =============================================================================
# launch-sonar-refresh-and-tests.ps1
# Script de lancement rapide: Rafraichissement dashboard + Execution tests
# =============================================================================

param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = ("0710oussamA@" | ConvertTo-SecureString -AsPlainText -Force)
)

# Verification du repertoire
if (-not (Test-Path "scripts\refresh-sonar-dashboard.ps1")) {
    Write-Host "[ERREUR] Executez ce script depuis la racine du monorepo (pfe-d2f-enseignants)" -ForegroundColor Red
    exit 1
}

# Affichage du menu
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  SonarQube Refresh + Tests Launcher" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Selectionnez une action:" -ForegroundColor Yellow
Write-Host "  [1] Refresh Dashboard + Executer tous les tests" -ForegroundColor Green
Write-Host "  [2] Uniquement Executer les tests (sans cleanup)" -ForegroundColor Green
Write-Host "  [3] Uniquement Refresh Dashboard (sans tests)" -ForegroundColor Gray
Write-Host "  [4] Quitter" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Votre choix [1-4]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[START] Lancement: Refresh Dashboard + Tests" -ForegroundColor Cyan
        Write-Host "Cela peut prendre plusieurs minutes..." -ForegroundColor Yellow
        & ".\scripts\refresh-sonar-dashboard.ps1" -SonarUrl $SonarUrl -SonarUser $SonarUser -SonarSecret $SonarSecret
        exit $LASTEXITCODE
    }
    "2" {
        Write-Host ""
        Write-Host "[START] Lancement: Execution des tests uniquement" -ForegroundColor Cyan
        Write-Host "Cela peut prendre plusieurs minutes..." -ForegroundColor Yellow
        & ".\scripts\run-all-sonar-tests.ps1" -SonarUrl $SonarUrl -SonarUser $SonarUser -SonarSecret $SonarSecret
        exit $LASTEXITCODE
    }
    "3" {
        Write-Host ""
        Write-Host "[START] Lancement: Refresh Dashboard uniquement" -ForegroundColor Cyan
        & ".\scripts\refresh-sonar-dashboard.ps1" -SonarUrl $SonarUrl -SonarUser $SonarUser -SonarSecret $SonarSecret
        exit $LASTEXITCODE
    }
    "4" {
        Write-Host ""
        Write-Host "[INFO] Annulation" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "[ERREUR] Choix invalide" -ForegroundColor Red
        exit 1
    }
}
