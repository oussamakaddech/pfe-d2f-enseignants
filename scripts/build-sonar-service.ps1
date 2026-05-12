
param(
    [string]$ServiceDir,
    [string]$ProjectKey
)

$ErrorActionPreference = "Continue"
$baseDir = "c:/Users/oussama/Desktop/pfe-d2f-enseignants"
Set-Location "$baseDir/$ServiceDir"
$env:JWT_SECRET = "9a674753-4567-4567-4567-456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "[BUILD] $ServiceDir (projectKey=$ProjectKey)" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# Build and test
& ".\mvnw.cmd" clean test jacoco:report 2>&1 | Select-Object -Last 10 | Write-Host
$buildResult = $LASTEXITCODE
Write-Host "BUILD EXIT: $buildResult"

if (Test-Path "target/site/jacoco/jacoco.xml") {
    Write-Host "[OK] JaCoCo report generated" -ForegroundColor Green
} else {
    Write-Host "[WARN] JaCoCo report NOT found" -ForegroundColor Yellow
}

# Generate SonarQube token
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:0710oussamA@"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}
$tokenName = "scan-" + $ProjectKey + "-" + (Get-Date -Format "yyyyMMdd-HHmmss")
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
    $json = $response.Content | ConvertFrom-Json
    $token = $json.token
    Write-Host "[OK] Token generated" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Token generation failed: $_" -ForegroundColor Red
    exit 1
}

# Send to SonarQube
Write-Host "[INFO] Sending to SonarQube..." -ForegroundColor Yellow
& ".\mvnw.cmd" sonar:sonar "-Dsonar.projectKey=$ProjectKey" "-Dsonar.host.url=http://localhost:9000" "-Dsonar.token=$token" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml" 2>&1 | Select-Object -Last 10 | Write-Host
Write-Host "SONAR EXIT: $LASTEXITCODE"
Write-Host "[LINK] http://localhost:9000/dashboard?id=$ProjectKey" -ForegroundColor Cyan
