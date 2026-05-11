# =============================================================================
# run-analyse-sonar.ps1 - Lancer l'analyse SonarQube UNIQUEMENT pour ANALYSE
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
        $tokenName = "analyse-scanner-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $headers = @{"Authorization" = "Basic $auth"; "Content-Type" = "application/json" }
        $response = Invoke-WebRequest -Uri "$Url/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
        return ($response.Content | ConvertFrom-Json).token
    }
    catch { return $null }
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Lancement de l'analyse Sonar pour : analyse" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

$token = Get-SonarQubeToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret
if (-not $token) {
    Write-Host "Erreur: Impossible d'obtenir le token SonarQube" -ForegroundColor Red
    exit 1
}

Write-Host "Token obtenu avec succes" -ForegroundColor Green

Push-Location ".\esprit_D2F-analyse"
try {
    Write-Host "`n[1/3] Nettoyage et compilation..." -ForegroundColor Yellow
    Write-Host "Répertoire courant: $(Get-Location)" -ForegroundColor Gray
    & .\mvnw.cmd clean compile test-compile jacoco:prepare-agent
    Write-Host "Compilation terminée" -ForegroundColor Green

    Write-Host "[2/3] Execution des tests et generation du rapport JaCoCo..." -ForegroundColor Yellow
    $testResult = & .\mvnw.cmd test jacoco:report "-Dmaven.test.failure.ignore=true" 2>&1

    # Afficher les résultats des tests
    Write-Host $testResult

    # Vérifier que les tests ont été exécutés
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Host "Avertissement: Certains tests ont échoué, mais le rapport JaCoCo sera généré..." -ForegroundColor Yellow
    }

    # Vérifier que le rapport JaCoCo a été généré
    if (-not (Test-Path "target/site/jacoco/jacoco.xml")) {
        Write-Host "Erreur: Le rapport JaCoCo n'a pas été généré" -ForegroundColor Red
        exit 1
    }

    # Vérifier que le rapport JaCoCo a été généré
    if (-not (Test-Path "target/site/jacoco/jacoco.xml")) {
        Write-Host "Erreur: Le rapport JaCoCo n'a pas été généré" -ForegroundColor Red
        exit 1
    }

    # Obtenir le chemin absolu du rapport JaCoCo
    $jacocoReportPath = (Resolve-Path "target/site/jacoco/jacoco.xml").Path

    Write-Host "[3/3] Envoi vers SonarQube..." -ForegroundColor Yellow
    & .\mvnw.cmd "sonar:sonar" `
        "-Dsonar.projectKey=d2f_analyse" `
        "-Dsonar.projectName=service-analyse" `
        "-Dsonar.host.url=$SonarUrl" `
        "-Dsonar.token=$token" `
        "-Dsonar.coverage.jacoco.xmlReportPaths=$jacocoReportPath" `
        "-Dsonar.qualitygate.wait=false"

    Write-Host "`n===============================================" -ForegroundColor Green
    Write-Host "[OK] Analyse SonarQube terminee !" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "Accedez au rapport : $SonarUrl/dashboard?id=d2f_analyse" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
