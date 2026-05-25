# ============================================================
# Lancement du service Formation avec variables d'environnement
# ============================================================
# Usage : .\start-formation.ps1
# ============================================================

$ROOT = Split-Path -Parent $PSScriptRoot
$ENV_FILE = Join-Path $ROOT ".env"

# Charger les variables depuis .env
if (Test-Path $ENV_FILE) {
    Write-Host "Chargement des variables depuis $ENV_FILE" -ForegroundColor Green
    foreach ($line in Get-Content $ENV_FILE) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $parts = $line.Split('=', 2)
        if ($parts.Count -ne 2) { continue }
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($name) {
            Set-Item -Path "Env:$name" -Value $value
        }
    }
} else {
    Write-Host "AVERTISSEMENT: Fichier .env introuvable a $ENV_FILE" -ForegroundColor Red
}

Write-Host "Demarrage Formation sur port 8088..." -ForegroundColor Cyan
Write-Host "  AZURE_AD_ENABLED = $env:AZURE_AD_ENABLED" -ForegroundColor DarkGray
Write-Host "  MAIL_HOST        = $env:MAIL_HOST" -ForegroundColor DarkGray

.\mvnw.cmd spring-boot:run -DskipTests
