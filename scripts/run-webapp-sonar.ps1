param(
    [Parameter(Mandatory = $true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$webappDir = Join-Path $PSScriptRoot "..\esprit_D2F-webapp"
$scanner = "C:\Users\oussama\.sonar\native-sonar-scanner\sonar-scanner-6.2.1.4610-windows-x64\bin\sonar-scanner.bat"

Set-Location $webappDir
$env:SONAR_TOKEN = $Token

& $scanner `
    "-Dsonar.host.url=http://localhost:9000" `
    "-Dsonar.token=$Token" `
    "-Dsonar.qualitygate.wait=true" `
    "-Dsonar.qualitygate.timeout=300"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Sonar scan FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "Sonar scan SUCCESS" -ForegroundColor Green