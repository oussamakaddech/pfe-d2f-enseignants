# Temporary script to run Sonar analysis for the gateway only
$SonarUrl = "http://localhost:9000"
$SonarUser = "admin"
$SonarPassword = "0710oussamA@"

Write-Host "[INFO] Generating SonarQube token..." -ForegroundColor Yellow
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$SonarUser`:$SonarPassword"))
$tokenName = "gateway-token-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "$SonarUrl/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
    $token = ($response.Content | ConvertFrom-Json).token
    Write-Host "[OK] Token generated successfully" -ForegroundColor Green

    Write-Host "[INFO] Running analysis for service-gateway..." -ForegroundColor Cyan
    Push-Location esprit_D2F-api-gateway
    .\mvnw.cmd clean test jacoco:report sonar:sonar `
        "-Dsonar.projectKey=esprit_D2F_api_gateway" `
        "-Dsonar.host.url=$SonarUrl" `
        "-Dsonar.token=$token" `
        "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
    Pop-Location
} catch {
    Write-Host "[ERREUR] $_" -ForegroundColor Red
}
