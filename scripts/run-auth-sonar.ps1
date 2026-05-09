# =============================================================================
# run-auth-sonar.ps1 - Lancer l'analyse SonarQube UNIQUEMENT pour AUTH
# =============================================================================
param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = ("0710oussamA@" | ConvertTo-SecureString -AsPlainText -Force)
)

function Get-SonarQubeToken {
    param([string]$Url, [string]$Username, [SecureString]$Secret)
    try {
        $plainPassword = [System.Net.NetworkCredential]::new("", $Secret).Password
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:$plainPassword"))
        $tokenName = "auth-scanner-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $headers = @{"Authorization" = "Basic $auth"; "Content-Type" = "application/json"}
        $response = Invoke-WebRequest -Uri "$Url/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
        return ($response.Content | ConvertFrom-Json).token
    } catch { return $null }
}

Write-Host "Lancement de l'analyse Sonar pour : esprit_D2F-authentification" -ForegroundColor Cyan

$token = Get-SonarQubeToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret
if (-not $token) { Write-Host "Erreur Token"; exit 1 }

Push-Location ".\esprit_D2F-authentification"
try {
    Write-Host "  [1/2] Execution des tests et generation du rapport JaCoCo..." -ForegroundColor Yellow
    .\mvnw.cmd clean test jacoco:report
    
    Write-Host "  [2/2] Envoi vers SonarQube..." -ForegroundColor Yellow
    .\mvnw.cmd "sonar:sonar" "-Dsonar.projectKey=auth" "-Dsonar.host.url=$SonarUrl" "-Dsonar.token=$token" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
    
    Write-Host "`n[OK] Analyse terminée !" -ForegroundColor Green
    Write-Host "Accedez au rapport : $SonarUrl/dashboard?id=auth" -ForegroundColor Cyan
} finally {
    Pop-Location
}
