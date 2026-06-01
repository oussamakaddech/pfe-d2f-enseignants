# analyze-services.ps1
# Analyse SonarQube pour chaque service en utilisant les variables d'environnement

$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "0710oussamA@"

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
    $mvnwPath = Join-Path $servicePath "mvnw.cmd"
    
    if (Test-Path $servicePath) {
        Write-Host "Analyse de $service..." -ForegroundColor Yellow
        
        Push-Location $servicePath
        
        try {
            $output = & cmd /c "mvnw.cmd sonar:sonar" 2>&1 | Out-String
            
            if ($output -match "BUILD SUCCESS") {
                $status = "SUCCESS"
                Write-Host "  -> $service : SUCCESS" -ForegroundColor Green
            } elseif ($output -match "BUILD FAILURE") {
                $status = "FAILED"
                Write-Host "  -> $service : FAILED" -ForegroundColor Red
            } else {
                $status = "UNKNOWN"
                Write-Host "  -> $service : UNKNOWN" -ForegroundColor Yellow
            }
            
            $results += [PSCustomObject]@{
                Service = $service
                Type = "Java/Maven"
                Status = $status
            }
        } catch {
            Write-Host "  -> $service : ERROR - $_" -ForegroundColor Red
            $results += [PSCustomObject]@{
                Service = $service
                Type = "Java/Maven"
                Status = "ERROR"
            }
        }
        
        Pop-Location
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