# =============================================================================
# Script d'analyse SonarQube pour tous les services
# =============================================================================

$ErrorActionPreference = "Continue"
$baseDir = "c:\Users\oussama\Desktop\pfe-d2f-enseignants"
$results = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ANALYSE SONARQUBE - TOUS LES SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Services Java/Maven
$javaServices = @(
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

Write-Host "=== Services Java/Maven ===" -ForegroundColor Yellow
foreach ($service in $javaServices) {
    $servicePath = Join-Path $baseDir $service
    $serviceName = $service -replace "esprit_D2F-", ""
    
    Write-Host ""
    Write-Host "Analyse de $service..." -ForegroundColor White
    
    if (Test-Path $servicePath) {
        try {
            Set-Location $servicePath
            $output = & ".\mvnw.cmd" sonar:sonar 2>&1
            $lastLines = $output | Select-Object -Last 20
            
            # Vérifier si l'analyse a réussi
            $success = $output | Where-Object { $_ -match "BUILD SUCCESS" }
            
            if ($success) {
                Write-Host "  -> $service : SUCCESS" -ForegroundColor Green
                $results += @{ Name = $service; Type = "Java/Maven"; Status = "SUCCESS" }
            } else {
                Write-Host "  -> $service : FAILED" -ForegroundColor Red
                $results += @{ Name = $service; Type = "Java/Maven"; Status = "FAILED" }
                Write-Host "  Erreur:" -ForegroundColor Yellow
                $lastLines | ForEach-Object { Write-Host "    $_" }
            }
        } catch {
            Write-Host "  -> $service : ERROR ($($_.Exception.Message))" -ForegroundColor Red
            $results += @{ Name = $service; Type = "Java/Maven"; Status = "ERROR" }
        }
    } else {
        Write-Host "  -> $service : NOT FOUND" -ForegroundColor Red
        $results += @{ Name = $service; Type = "Java/Maven"; Status = "NOT FOUND" }
    }
}

# Services Python
$pythonServices = @("esprit_D2F-predictive-analytics", "esprit_D2F-rice")

Write-Host ""
Write-Host "=== Services Python ===" -ForegroundColor Yellow
foreach ($service in $pythonServices) {
    $servicePath = Join-Path $baseDir $service
    $serviceName = $service -replace "esprit_D2F-", ""
    
    Write-Host ""
    Write-Host "Analyse de $service..." -ForegroundColor White
    
    if (Test-Path $servicePath) {
        try {
            Set-Location $servicePath
            $output = & "sonar-scanner" 2>&1
            $lastLines = $output | Select-Object -Last 20
            
            $success = $output | Where-Object { $_ -match "ANALYSIS SUCCESSFUL" }
            
            if ($success) {
                Write-Host "  -> $service : SUCCESS" -ForegroundColor Green
                $results += @{ Name = $service; Type = "Python"; Status = "SUCCESS" }
            } else {
                Write-Host "  -> $service : FAILED" -ForegroundColor Red
                $results += @{ Name = $service; Type = "Python"; Status = "FAILED" }
            }
        } catch {
            Write-Host "  -> $service : ERROR ($($_.Exception.Message))" -ForegroundColor Red
            $results += @{ Name = $service; Type = "Python"; Status = "ERROR" }
        }
    } else {
        Write-Host "  -> $service : NOT FOUND" -ForegroundColor Red
        $results += @{ Name = $service; Type = "Python"; Status = "NOT FOUND" }
    }
}

# Service Node.js
$webappPath = Join-Path $baseDir "esprit_D2F-webapp"
Write-Host ""
Write-Host "=== Service Node.js ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Analyse de esprit_D2F-webapp..." -ForegroundColor White

if (Test-Path $webappPath) {
    try {
        Set-Location $webappPath
        $output = & "sonar-scanner" 2>&1
        $lastLines = $output | Select-Object -Last 20
        
        $success = $output | Where-Object { $_ -match "ANALYSIS SUCCESSFUL" }
        
        if ($success) {
            Write-Host "  -> webapp : SUCCESS" -ForegroundColor Green
            $results += @{ Name = "esprit_D2F-webapp"; Type = "Node.js"; Status = "SUCCESS" }
        } else {
            Write-Host "  -> webapp : FAILED" -ForegroundColor Red
            $results += @{ Name = "esprit_D2F-webapp"; Type = "Node.js"; Status = "FAILED" }
        }
    } catch {
        Write-Host "  -> webapp : ERROR ($($_.Exception.Message))" -ForegroundColor Red
        $results += @{ Name = "esprit_D2F-webapp"; Type = "Node.js"; Status = "ERROR" }
    }
} else {
    Write-Host "  -> webapp : NOT FOUND" -ForegroundColor Red
    $results += @{ Name = "esprit_D2F-webapp"; Type = "Node.js"; Status = "NOT FOUND" }
}

# Résumé
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("{0,-35} {1,-12} {2}" -f "Service", "Type", "Status")
Write-Host ("-" * 65)
foreach ($r in $results) {
    $color = switch ($r.Status) {
        "SUCCESS" { "Green" }
        "FAILED" { "Red" }
        "ERROR" { "Red" }
        "NOT FOUND" { "Red" }
        default { "White" }
    }
    Write-Host ("{0,-35} {1,-12} {2}" -f $r.Name, $r.Type, $r.Status) -ForegroundColor $color
}

$successCount = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$totalCount = $results.Count
Write-Host ""
Write-Host "Resultat: $successCount / $totalCount services reussis" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })