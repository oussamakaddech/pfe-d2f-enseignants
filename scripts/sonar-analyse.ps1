
$ErrorActionPreference = "Continue"
Set-Location "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-analyse"

# Generate token
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:0710oussamA@"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}
$tokenName = "scan-analyse-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$response = Invoke-WebRequest -Uri "http://localhost:9000/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
$token = $json.token
Write-Host "[OK] Token generated" -ForegroundColor Green

# Send to SonarQube
& ".\mvnw.cmd" sonar:sonar "-Dsonar.projectKey=d2f_analyse" "-Dsonar.host.url=http://localhost:9000" "-Dsonar.token=$token" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml" 2>&1 | Select-Object -Last 20 | Write-Host
Write-Host "EXIT CODE: $LASTEXITCODE"
