
# =============================================================================
# run-sonar-single.ps1 - Run SonarQube analysis for a single service
# =============================================================================
param(
    [string]$ServiceName,
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [string]$SonarPassword = "0710oussamA@"
)

$ErrorActionPreference = "Stop"

# Generate token
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarUser}:${SonarPassword}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

Write-Host "[INFO] Generating SonarQube token..." -ForegroundColor Yellow
$tokenName = "scan-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$response = Invoke-WebRequest -Uri "$SonarUrl/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
$SonarToken = $json.token
Write-Host "[OK] Token generated" -ForegroundColor Green

# Project key mapping
$projectKeyMap = @{
    "esprit_D2F-api-gateway" = "d2f_api_gateway"
    "esprit_D2F-authentification" = "d2f_authentification"
    "esprit_D2F-besoin-formation" = "d2f_besoin_formation"
    "esprit_D2F-certificat" = "d2f_certificat"
    "esprit_D2F-competence" = "d2f_competence"
    "esprit_D2F-evaluation" = "d2f_evaluation"
    "esprit_D2F-formation" = "d2f_formation"
    "esprit_D2F-analyse" = "d2f_analyse"
    "esprit_D2F-webapp" = "d2f_webapp"
}

$projectKey = $projectKeyMap[$ServiceName]
if (-not $projectKey) {
    $projectKey = $ServiceName -replace "-", "_"
}

$servicePath = ".\$ServiceName"
if (-not (Test-Path $servicePath)) {
    Write-Host "[ERROR] Service directory not found: $servicePath" -ForegroundColor Red
    exit 1
}

Push-Location $servicePath

try {
    if (Test-Path "package.json") {
        Write-Host "[INFO] NodeJS project detected" -ForegroundColor Yellow
        if (-not (Test-Path "node_modules")) {
            npm install --quiet
        }
        npx sonar-scanner -Dsonar.projectKey=$projectKey -Dsonar.host.url=$SonarUrl -Dsonar.token=$SonarToken
    } else {
        Write-Host "[INFO] Maven project detected" -ForegroundColor Yellow
        $mvnwPath = ".\mvnw.cmd"
        if (-not (Test-Path $mvnwPath)) {
            Write-Host "[ERROR] mvnw.cmd not found" -ForegroundColor Red
            Pop-Location
            exit 1
        }

        Write-Host "[INFO] Running tests with coverage..." -ForegroundColor Yellow
        & $mvnwPath clean test jacoco:report 2>&1 | Write-Host
        $testResult = $LASTEXITCODE

        if ($testResult -ne 0) {
            Write-Host "[WARN] Tests failed (exit code $testResult), still sending to SonarQube..." -ForegroundColor Yellow
        }

        Write-Host "[INFO] Sending to SonarQube..." -ForegroundColor Yellow
        & $mvnwPath sonar:sonar "-Dsonar.projectKey=$projectKey" "-Dsonar.host.url=$SonarUrl" "-Dsonar.token=$SonarToken" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml" 2>&1 | Write-Host
        $sonarResult = $LASTEXITCODE

        if ($sonarResult -eq 0) {
            Write-Host "[OK] SonarQube analysis successful" -ForegroundColor Green
            Write-Host "[LINK] $SonarUrl/dashboard?id=$projectKey" -ForegroundColor Cyan
        } else {
            Write-Host "[ERROR] SonarQube analysis failed (exit code $sonarResult)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "[ERROR] Exception: $_" -ForegroundColor Red
} finally {
    Pop-Location
}
