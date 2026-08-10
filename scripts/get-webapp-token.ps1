param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "d2f_admin_2026!"
)

$ErrorActionPreference = "Stop"
$tokenName = "cli-webapp-token-$(Get-Date -Format 'yyyyMMddHHmmss')"

try {
    $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${AdminUser}:${AdminPassword}"))
    $response = Invoke-RestMethod -Uri "$SonarUrl/api/user_tokens/generate?name=$tokenName" `
        -Method Post `
        -Headers @{ "Authorization" = "Basic $basic" } `
        -UseBasicParsing
    Write-Host $response.token
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
