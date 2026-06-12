$SonarUrl = if ($env:SONAR_HOST_URL) { $env:SONAR_HOST_URL } else { "http://localhost:9000" }
$AdminUser = if ($env:SONAR_ADMIN_USER) { $env:SONAR_ADMIN_USER } else { "admin" }
$AdminPassword = if ($env:SONAR_ADMIN_PASSWORD) { $env:SONAR_ADMIN_PASSWORD } else {
    Read-Host -AsSecureString "Mot de passe administrateur SonarQube" | ConvertFrom-SecureString -AsPlainText
}

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AdminUser`:$AdminPassword"))
$headers = @{
    "Authorization" = "Basic $base64Auth"
}

Write-Host "=== Creating new token ==="
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$body = "name=maven-token-$timestamp"

try {
    $response = Invoke-WebRequest -Uri "$SonarUrl/api/user_tokens/generate" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/x-www-form-urlencoded" `
        -UseBasicParsing

    Write-Host "SUCCESS! Response: $($response.Content)"
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "Token: $($jsonResponse.token)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host "Response body: $responseBody"
    }
}