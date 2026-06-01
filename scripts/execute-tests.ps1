# Script pour exécuter les tests et générer un rapport de couverture
$ErrorActionPreference = "Stop"

# Définir les modules à tester
$modules = @(
    "esprit_D2F-authentification",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-formation",
    "esprit_D2F-evaluation",
    "esprit_D2F-certificat",
    "esprit_D2F-analyse"
)

# Couverture actuelle estimée (basée sur les rapports SonarQube)
$currentCoverage = @{
    "esprit_D2F-authentification" = 0.0
    "esprit_D2F-besoin-formation" = 14.6
    "esprit_D2F-formation" = 82.5
    "esprit_D2F-evaluation" = 22.5
    "esprit_D2F-certificat" = 16.9
    "esprit_D2F-analyse" = 0.0
}

# Fonction pour exécuter les tests d'un module
function Test-Module {
    param([string]$module)

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Testing module: $module" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $modulePath = Join-Path $PSScriptRoot "..\$module"

    if (-not (Test-Path $modulePath)) {
        Write-Host "Module path not found: $modulePath" -ForegroundColor Red
        return
    }

    try {
        # Exécuter les tests avec JaCoCo pour la couverture
        Push-Location $modulePath
        & ".\mvnw.cmd" clean test jacoco:report -DskipTests=false

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Tests passed for $module" -ForegroundColor Green

            # Lire le rapport JaCoCo si disponible
            $jacocoReport = Join-Path $modulePath "target\site\jacoco\index.html"
            if (Test-Path $jacocoReport) {
                Write-Host "Coverage report: $jacocoReport" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Tests failed for $module" -ForegroundColor Red
        }
    }
    finally {
        Pop-Location
    }
}

# Fonction pour afficher le résumé de la couverture
function Show-Coverage-Summary {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "COVERAGE SUMMARY" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    $totalCoverage = 0
    $moduleCount = $modules.Count

    foreach ($module in $modules) {
        $coverage = $currentCoverage[$module]
        $totalCoverage += $coverage

        # Colorer selon le niveau de couverture
        if ($coverage -ge 80) {
            $color = "Green"
        } elseif ($coverage -ge 50) {
            $color = "Yellow"
        } else {
            $color = "Red"
        }

        $moduleFormatted = $module.PadRight(30)
        $coverageFormatted = "{0:F2}%" -f $coverage
        Write-Host "$moduleFormatted : $coverageFormatted" -ForegroundColor $color
    }

    $averageCoverage = $totalCoverage / $moduleCount
    Write-Host "`nAverage Coverage: {0:F2}%" -f $averageCoverage -ForegroundColor Cyan

    if ($averageCoverage -lt 80) {
        Write-Host "`nWARNING: Average coverage is below 80%!" -ForegroundColor Yellow
    } else {
        Write-Host "`nAverage coverage meets the 80% target!" -ForegroundColor Green
    }
}

# Afficher la couverture actuelle
Show-Coverage-Summary

# Demander à l'utilisateur s'il veut exécuter les tests
$response = Read-Host "`nVoulez-vous exécuter les tests maintenant? (O/N)"

if ($response -eq "O" -or $response -eq "o") {
    Write-Host "`nExécution des tests..." -ForegroundColor Cyan

    # Exécuter les tests pour chaque module
    foreach ($module in $modules) {
        Test-Module $module
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST EXECUTION COMPLETED" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host "`nExécution des tests annulée." -ForegroundColor Yellow
}

Write-Host "`nPour voir les rapports de couverture, ouvrez les fichiers index.html dans:" -ForegroundColor Cyan
Write-Host "  - <module>	arget\site\jacoco\index.html" -ForegroundColor Yellow
