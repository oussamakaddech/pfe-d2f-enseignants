# automate-sonar.ps1
# Ce script lance l'analyse SonarQube toutes les 2 heures.

$intervalMinutes = 120
$scriptPath = "$PSScriptRoot\run-all-sonar-tests.ps1"

Write-Host "Démarrage de l'automatisation SonarQube..." -ForegroundColor Cyan
Write-Host "L'analyse sera lancée toutes les $intervalMinutes minutes (2 heures)." -ForegroundColor Gray

while ($true) {
    $now = Get-Date -Format "HH:mm:ss"
    Write-Host "[$now] Lancement de l'analyse complète..." -ForegroundColor Yellow
    
    try {
        & $scriptPath
        Write-Host "[$now] Analyse terminée avec succès." -ForegroundColor Green
    } catch {
        Write-Error "[$now] Erreur lors de l'exécution de l'analyse : $_"
    }
    
    Write-Host "Prochain rafraîchissement dans 2 heures. Appuyez sur Ctrl+C pour arrêter." -ForegroundColor Gray
    Start-Sleep -Seconds ($intervalMinutes * 60)
}
