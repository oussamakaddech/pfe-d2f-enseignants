# =============================================================================
# run-evaluation-sonar.ps1 - Lancer les tests SonarQube pour le service evaluation
# =============================================================================

$service = "esprit_D2F-evaluation"
$projectKey = "service_evaluation"
$sonarUrl = "http://localhost:9000"

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Lancement des tests SonarQube pour : $service" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan

Push-Location $service

try {
    Write-Host "[1/2] Execution des tests et generation du rapport JaCoCo..." -ForegroundColor Yellow
    .\mvnw.cmd clean test jacoco:report
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Les tests ont echoue." -ForegroundColor Red
        exit 1
    }

    Write-Host "[2/2] Analyse SonarQube..." -ForegroundColor Yellow
    # On suppose que le token est configure ou qu'on utilise l'authentification par defaut
    .\mvnw.cmd sonar:sonar `
        "-Dsonar.projectKey=$projectKey" `
        "-Dsonar.host.url=$sonarUrl" `
        "-Dsonar.login=admin" `
        "-Dsonar.password=0710oussamA@" `
        "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Analyse SonarQube reussie !" -ForegroundColor Green
        Write-Host "Consulter les resultats : $sonarUrl/dashboard?id=$projectKey" -ForegroundColor Cyan
    } else {
        Write-Host "[ERREUR] L'analyse SonarQube a echoue." -ForegroundColor Red
    }
} finally {
    Pop-Location
}
