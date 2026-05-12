# Script de scan SonarQube pour tous les services (SEC-14)
# Execute l'analyse de vulnérabilités et qualite pour tous les modules

$ERRORS = 0
$REPORT = @()

Write-Host "=== SonarQube Vulnerability Scan - D2F Platform ===" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{Name="auth-service"; Dir="esprit_D2F-authentification"; Key="d2f_auth"},
    @{Name="competence-service"; Dir="esprit_D2F-competence"; Key="d2f_competence"},
    @{Name="besoin-formation-service"; Dir="esprit_D2F-besoin-formation"; Key="d2f_besoin"},
    @{Name="formation-service"; Dir="esprit_D2F-formation"; Key="d2f_formation"},
    @{Name="evaluation-service"; Dir="esprit_D2F-evaluation"; Key="d2f_evaluation"},
    @{Name="certificat-service"; Dir="esprit_D2F-certificat"; Key="d2f_certificat"},
    @{Name="gateway-service"; Dir="esprit_D2F-api-gateway"; Key="d2f_gateway"},
    @{Name="analyse-service"; Dir="esprit_D2F-analyse"; Key="d2f_analyse"},
    @{Name="webapp"; Dir="esprit_D2F-webapp"; Key="d2f_webapp"}
)

foreach ($svc in $services) {
    Write-Host "Scanning $($svc.Name)..." -ForegroundColor Yellow
    $start = Get-Date

    Push-Location $svc.Dir
    if (Test-Path "pom.xml") {
        $result = & ".\mvnw" clean verify sonar:sonar `
            -Dsonar.projectKey=$($svc.Key) `
            -Dsonar.host.url=http://localhost:9000 `
            -Dsonar.login=$env:SONAR_TOKEN `
            -Dsonar.qualitygate.wait=true 2>&1
    } elseif (Test-Path "package.json") {
        $result = & "npm" run test:coverage 2>&1
        # SonarQube scan via GitHub action in CI
    }
    Pop-Location

    $duration = (Get-Date) - $start
    $status = "PASS"
    if ($LASTEXITCODE -ne 0) { $status = "FAIL"; $ERRORS++ }
    
    $REPORT += [PSCustomObject]@{
        Service = $svc.Name
        Status  = $status
        Duration = "$($duration.Minutes)m $($duration.Seconds)s"
    }
    Write-Host "  -> $status ($($duration.Minutes)m $($duration.Seconds)s)" -ForegroundColor $(if($status -eq "PASS"){"Green"}else{"Red"})
}

Write-Host ""
Write-Host "=== Rapport SonarQube ===" -ForegroundColor Cyan
$REPORT | Format-Table -Property Service, Status, Duration -AutoSize
Write-Host "Errors: $ERRORS" -ForegroundColor $(if($ERRORS -eq 0){"Green"}else{"Red"})
