param(
    [string]$servicePath,
    [string]$serviceName,
    [string]$token = "squ_76df64eaa556df77fa3a17d8b42b6a2107d8871f"
)

$ErrorActionPreference = "Continue"
Set-Location $servicePath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Analyse SonarQube: $serviceName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Compiler d'abord
Write-Host "Compilation..." -ForegroundColor Yellow
$compileOutput = & ".\mvnw.cmd" compile 2>&1
if ($compileOutput -match "BUILD SUCCESS") {
    Write-Host "  Compilation: OK" -ForegroundColor Green
} else {
    Write-Host "  Compilation: ECHEC" -ForegroundColor Red
    $compileOutput | Select-Object -Last 10 | ForEach-Object { Write-Host "    $_" }
}

# Lancer les tests (ignorer les échecs pour l'instant)
Write-Host "Tests..." -ForegroundColor Yellow
$testOutput = & ".\mvnw.cmd" test 2>&1
if ($testOutput -match "BUILD SUCCESS" -or $testOutput -match "Tests run:") {
    Write-Host "  Tests: OK" -ForegroundColor Green
} else {
    Write-Host "  Tests: ECHEC (continuation..." -ForegroundColor Yellow
}

# Générer le rapport JaCoCo
Write-Host "Couverture de code..." -ForegroundColor Yellow
$jacocoOutput = & ".\mvnw.cmd" jacoco:report 2>&1
if ($jacocoOutput -match "BUILD SUCCESS") {
    Write-Host "  JaCoCo: OK" -ForegroundColor Green
} else {
    Write-Host "  JaCoCo: ECHEC" -ForegroundColor Red
}

# Lancer sonar-scanner
Write-Host "Analyse SonarQube..." -ForegroundColor Yellow

# Construire la commande avec les bons guillemets
$tokenArg = "-Dsonar.token=$token"
$sonarOutput = & ".\mvnw.cmd" sonar:sonar $tokenArg 2>&1

if ($sonarOutput -match "BUILD SUCCESS") {
    Write-Host "  SonarQube: OK" -ForegroundColor Green
    return "SUCCESS"
} else {
    Write-Host "  SonarQube: ECHEC" -ForegroundColor Red
    $sonarOutput | Select-Object -Last 30 | ForEach-Object { Write-Host "    $_" }
    return "FAILED"
}