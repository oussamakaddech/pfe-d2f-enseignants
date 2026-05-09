$SonarUrl = "http://localhost:9000"
$AdminUser = "admin"
$AdminPassword = "0710oussamA@"

$body = @{
    name = "antigravity-token-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$SonarUrl/api/user_tokens/generate" `
        -Method Post `
        -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AdminUser`:$AdminPassword")))" } `
        -ContentType "application/json" `
        -Body $body

    Write-Host $response.token
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
