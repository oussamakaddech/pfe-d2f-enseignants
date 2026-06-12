
# =============================================================================
# run-formation-sonar.ps1 - Lancer l'analyse SonarQube UNIQUEMENT pour FORMATION
# =============================================================================
param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = $(if ($env:SONAR_ADMIN_PASSWORD) { $env:SONAR_ADMIN_PASSWORD | ConvertTo-SecureString -AsPlainText -Force } else { Read-Host -AsSecureString "Mot de passe administrateur SonarQube" })
)

function Get-SonarQubeToken {
    param([string]$Url, [string]$Username, [SecureString]$Secret)
    try {
        $plainPassword = [System.Net.NetworkCredential]::new("", $Secret).Password
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:$plainPassword"))
        $tokenName = "formation-scanner-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $headers = @{"Authorization" = "Basic $auth"; "Content-Type" = "application/json" }
        $response = Invoke-WebRequest -Uri "$Url/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
        return ($response.Content | ConvertFrom-Json).token
    }
    catch { return $null }
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Lancement de l'analyse Sonar pour : formation" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

$token = Get-SonarQubeToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret
if (-not $token) {
    Write-Host "Erreur: Impossible d'obtenir le token SonarQube" -ForegroundColor Red
    exit 1
}

Write-Host "Token obtenu avec succes" -ForegroundColor Green

Push-Location ".\esprit_D2F-formation"
try {
    Write-Host "`n[1/3] Nettoyage et compilation..." -ForegroundColor Yellow
    .\mvnw.cmd clean compile -q

    Write-Host "[2/3] Execution des tests et generation du rapport JaCoCo..." -ForegroundColor Yellow
    .\mvnw.cmd test jacoco:report -q

    # Vérifier que le rapport JaCoCo a été généré
    if (-not (Test-Path "target/site/jacoco/jacoco.xml")) {
        Write-Host "Erreur: Le rapport JaCoCo n'a pas été généré" -ForegroundColor Red
        exit 1
    }

    # Obtenir le chemin absolu du rapport JaCoCo
    $jacocoReportPath = (Resolve-Path "target/site/jacoco/jacoco.xml").Path

    Write-Host "[3/3] Envoi vers SonarQube..." -ForegroundColor Yellow
    .\mvnw.cmd "sonar:sonar" `
        "-Dsonar.projectKey=d2f_formation" `
        "-Dsonar.projectName=service-formation" `
        "-Dsonar.host.url=$SonarUrl" `
        "-Dsonar.token=$token" `
        "-Dsonar.coverage.jacoco.xmlReportPaths=$jacocoReportPath" `
        "-Dsonar.qualitygate.wait=true"

    Write-Host "`n===============================================" -ForegroundColor Green
    Write-Host "[OK] Analyse SonarQube terminee !" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "Accedez au rapport : $SonarUrl/dashboard?id=d2f_formation" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
