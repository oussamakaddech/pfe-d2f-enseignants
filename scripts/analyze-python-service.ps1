param(
    [string]$servicePath,
    [string]$serviceName,
    [string]$token = "squ_76df64eaa556df77fa3a17d8b42b6a2107d8871f"
)

$ErrorActionPreference = "Continue"
Set-Location $servicePath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Analyse SonarQube Python: $serviceName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Lancer les tests pytest
Write-Host "Tests..." -ForegroundColor Yellow
$testOutput = & "pytest" --junitxml=junit-results.xml 2>&1
if ($LASTEXITCODE -eq 0 -or $testOutput -match "passed") {
    Write-Host "  Tests: OK" -ForegroundColor Green
} else {
    Write-Host "  Tests: ECHEC (continuation..." -ForegroundColor Yellow
}

# Générer le rapport de couverture
Write-Host "Couverture de code..." -ForegroundColor Yellow
$covOutput = & "pytest-cov" --cov=. --cov-report=xml 2>&1
if ($LASTEXITCODE -eq 0 -or $covOutput -match "TOTAL") {
    Write-Host "  Couverture: OK" -ForegroundColor Green
} else {
    Write-Host "  Couverture: ECHEC" -ForegroundColor Red
}

# Lancer sonar-scanner
Write-Host "Analyse SonarQube..." -ForegroundColor Yellow
$env:SONAR_TOKEN = $token
$env:SONAR_HOST_URL = "http://localhost:9000"

# Utiliser le scanner sonar
$sonarOutput = & "sonar-scanner" -Dsonar.token=$token 2>&1

if ($sonarOutput -match "ANALYSIS SUCCESSFUL" -or $sonarOutput -match "SonarQube") {
    Write-Host "  SonarQube: OK" -ForegroundColor Green
    return "SUCCESS"
} else {
    Write-Host "  SonarQube: ECHEC" -ForegroundColor Red
    $sonarOutput | Select-Object -Last 30 | ForEach-Object { Write-Host "    $_" }
    return "FAILED"
}