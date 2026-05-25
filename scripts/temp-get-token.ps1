$SonarUrl = "http://localhost:9000"
$AdminUser = "admin"
$AdminPassword = "0710oussamA@"

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