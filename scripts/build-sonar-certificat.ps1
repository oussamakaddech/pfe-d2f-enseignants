
$ErrorActionPreference = "Continue"
Set-Location "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-certificat"
$env:JWT_SECRET = "9a674753-4567-4567-4567-456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567"

# Build and test
Write-Host "[INFO] Building and testing service-certificat..." -ForegroundColor Yellow
& ".\mvnw.cmd" clean test jacoco:report 2>&1 | Select-Object -Last 15 | Write-Host
Write-Host "BUILD EXIT CODE: $LASTEXITCODE"

if (Test-Path "target/site/jacoco/jacoco.xml") {
    Write-Host "SUCCESS: JaCoCo report generated" -ForegroundColor Green
} else {
    Write-Host "WARNING: JaCoCo report NOT found" -ForegroundColor Yellow
}

# Generate SonarQube token
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:0710oussamA@"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}
$tokenName = "scan-certificat-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$response = Invoke-WebRequest -Uri "http://localhost:9000/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
$token = $json.token
Write-Host "[OK] SonarQube token generated" -ForegroundColor Green

# Send to SonarQube
Write-Host "[INFO] Sending to SonarQube..." -ForegroundColor Yellow
& ".\mvnw.cmd" sonar:sonar "-Dsonar.projectKey=d2f_certificat" "-Dsonar.host.url=http://localhost:9000" "-Dsonar.token=$token" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml" 2>&1 | Select-Object -Last 15 | Write-Host
Write-Host "SONAR EXIT CODE: $LASTEXITCODE"
