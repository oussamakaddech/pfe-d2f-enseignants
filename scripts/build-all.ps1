# Build all Java services with shared dependency resolution
param([switch]$SkipTests)

$ROOT = Split-Path -Parent $PSScriptRoot
$ERRORS = 0

Write-Host "=== D2F Platform - Full Build ===" -ForegroundColor Cyan

# Step 1: Build shared security module
Write-Host "`n[1/2] Building shared security module (esprit_D2F-common-security)..." -ForegroundColor Yellow
Push-Location "$ROOT\esprit_D2F-common-security"
$mvnArgs = @("clean", "install", "-DskipTests")
if (-not $SkipTests) { $mvnArgs = @("clean", "install") }
& ".\mvnw" $mvnArgs 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { $ERRORS++ }
Pop-Location

# Step 2: Build all services
$services = @(
    "esprit_D2F-authentification",
    "esprit_D2F-competence",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-formation",
    "esprit_D2F-evaluation",
    "esprit_D2F-certificat",
    "esprit_D2F-analyse",
    "esprit_D2F-api-gateway"
)

Write-Host "`n[2/2] Building microservices..." -ForegroundColor Yellow
foreach ($svc in $services) {
    Write-Host "  Building $svc..." -NoNewline
    Push-Location "$ROOT\$svc"
    $mvnArgs = @("clean", "compile", "-DskipTests")
    if (-not $SkipTests) { $mvnArgs = @("clean", "test") }
    & ".\mvnw" $mvnArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $ERRORS++
    }
    Pop-Location
}

Write-Host "`n=== Build complete. Errors: $ERRORS ===" -ForegroundColor $(if($ERRORS -eq 0){"Green"}else{"Red"})
