# run-sonar-docker.ps1
# Lance l'analyse SonarQube pour chaque service via Docker

$SonarUrl = "http://localhost:9000"
$AdminUser = "admin"
$AdminPassword = "0710oussamA@"

$BaseDir = "c:\Users\oussama\Desktop\pfe-d2f-enseignants"

# Services Java/Maven
$JavaServices = @(
    "esprit_D2F-authentification",
    "esprit_D2F-api-gateway",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-certificat",
    "esprit_D2F-competence",
    "esprit_D2F-evaluation",
    "esprit_D2F-formation",
    "esprit_D2F-analyse",
    "esprit_D2F-common-security"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ANALYSE SONARQUBE - SERVICES JAVA/MAVEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

foreach ($service in $JavaServices) {
    $servicePath = Join-Path $BaseDir $service
    $projectKey = $service -replace "esprit_D2F-", "d2f_"
    
    if (Test-Path $servicePath) {
        Write-Host "Analyse de $service..." -ForegroundColor Yellow
        
        try {
            docker run --rm -e SONAR_HOST_URL=$SonarUrl -e SONAR_TOKEN=$AdminPassword `
                -v "${servicePath}:/usr/src" `
                sonarsource/sonar-scanner-cli:latest 2>&1 | Out-String
            
            Write-Host "  -> $service : SUCCESS" -ForegroundColor Green
            $results += [PSCustomObject]@{
                Service = $service
                Type = "Java/Maven"
                Status = "SUCCESS"
            }
        } catch {
            Write-Host "  -> $service : ERROR - $_" -ForegroundColor Red
            $results += [PSCustomObject]@{
                Service = $service
                Type = "Java/Maven"
                Status = "ERROR"
            }
        }
    } else {
        Write-Host "  -> $service : PATH NOT FOUND" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Service = $service
            Type = "Java/Maven"
            Status = "NOT FOUND"
        }
    }
    Write-Host ""
}

# Résumé
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$successCount = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$totalCount = $results.Count
Write-Host ""
Write-Host "Resultat: $successCount / $totalCount services reussis" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })