$SonarUrl = if ($env:SONAR_HOST_URL) { $env:SONAR_HOST_URL } else { "http://localhost:9000" }
$AdminUser = if ($env:SONAR_ADMIN_USER) { $env:SONAR_ADMIN_USER } else { "admin" }
$AdminPassword = if ($env:SONAR_ADMIN_PASSWORD) { $env:SONAR_ADMIN_PASSWORD } else {
    Read-Host -AsSecureString "Mot de passe administrateur SonarQube" | ConvertFrom-SecureString -AsPlainText
}

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
