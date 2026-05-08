# script: automation\scheduled-sonar-refresh.ps1
# Description: Supprime TOUS les projets SonarQube existants (pour éviter les doublons) et relance une analyse complète toutes les 2 heures.

$intervalHours = 2
$sonarUrl = "http://localhost:9000"
$sonarAuth = "admin:0710oussamA@"

function Refresh-Sonar {
    Write-Host "[$(Get-Date)] Démarrage du nettoyage agressif SonarQube..." -ForegroundColor Cyan
    
    # Préparation de l'authentification
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($sonarAuth)
    $base64 = [System.Convert]::ToBase64String($bytes)
    $headers = @{Authorization = "Basic $base64"}

    try {
        # 1. Recherche de TOUS les projets existants
        $searchUri = "$sonarUrl/api/projects/search?ps=100"
        $resp = (Invoke-WebRequest -Uri $searchUri -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
        
        if ($resp.components.Count -gt 0) {
            Write-Host "  [INFO] $($resp.components.Count) projets trouvés à supprimer." -ForegroundColor Gray
            foreach ($comp in $resp.components) {
                try {
                    Invoke-WebRequest -Uri "$sonarUrl/api/projects/delete?project=$($comp.key)" -Method POST -Headers $headers -UseBasicParsing
                    Write-Host "  [OK] Projet supprimé : $($comp.key)" -ForegroundColor Green
                } catch {
                    Write-Host "  [ERROR] Échec de suppression : $($comp.key)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  [INFO] Aucun projet trouvé." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [ERROR] Impossible de contacter SonarQube pour le nettoyage." -ForegroundColor Red
    }

    # 2. Relance de l'analyse complète
    Write-Host "[$(Get-Date)] Relance de l'analyse complète via le script global..." -ForegroundColor Yellow
    & ".\scripts\run-all-sonar-tests.ps1"

    Write-Host "[$(Get-Date)] Refresh terminé. Prochaine mise à jour dans $intervalHours heures." -ForegroundColor Green
}

# Boucle infinie
while ($true) {
    Refresh-Sonar
    Start-Sleep -Seconds ($intervalHours * 3600)
}
