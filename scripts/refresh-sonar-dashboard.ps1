# =============================================================================
# refresh-sonar-dashboard.ps1 - Rafraîchissement total du dashboard SonarQube
# =============================================================================
param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = ("0710oussamA@" | ConvertTo-SecureString -AsPlainText -Force)
)

# =============================================================================
# Fonction pour générer un token SonarQube
# =============================================================================
function Get-SonarQubeToken {
    param(
        [string]$Url,
        [string]$Username,
        [SecureString]$Secret
    )

    try {
        Write-Host "  [INFO] Génération d'un token SonarQube..." -ForegroundColor Yellow

        # Convertir SecureString en texte clair pour l'API
        $plainPassword = [System.Net.NetworkCredential]::new("", $Secret).Password
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:$plainPassword"))
        $tokenName = "dashboard-refresh-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $headers = @{
            "Authorization" = "Basic $auth"
            "Content-Type" = "application/json"
        }

        $response = Invoke-WebRequest `
            -Uri "$Url/api/user_tokens/generate?name=$tokenName" `
            -Method Post `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop

        $json = $response.Content | ConvertFrom-Json
        Write-Host "  [OK] Token généré avec succès" -ForegroundColor Green
        return $json.token
    } catch {
        Write-Host "  [ERREUR] Impossible de générer le token: $_" -ForegroundColor Red
        return $null
    }
}

# =============================================================================
# Fonction pour supprimer un projet SonarQube
# =============================================================================
function Remove-SonarQubeProject {
    param(
        [string]$ProjectKey,
        [string]$SonarToken,
        [string]$SonarUrl
    )

    try {
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarToken}:"))
        $headers = @{ "Authorization" = "Basic $auth" }

        Write-Host "  [INFO] Suppression du projet $ProjectKey..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "$SonarUrl/api/projects/delete?project=$ProjectKey" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop | Out-Null
        Write-Host "  [OK] Projet $ProjectKey supprimé" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [WARN] Impossible de supprimer le projet $ProjectKey : $_" -ForegroundColor Yellow
        return $false
    }
}

# =============================================================================
# Fonction pour lister tous les projets SonarQube
# =============================================================================
function Get-SonarQubeProjects {
    param(
        [string]$SonarToken,
        [string]$SonarUrl
    )

    try {
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarToken}:"))
        $headers = @{ "Authorization" = "Basic $auth" }

        $response = Invoke-WebRequest -Uri "$SonarUrl/api/projects/search?ps=500" -Headers $headers -UseBasicParsing -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        return $json.components
    } catch {
        Write-Host "  [ERREUR] Impossible de lister les projets: $_" -ForegroundColor Red
        return @()
    }
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Rafraîchissement total du dashboard SonarQube" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Générer le token SonarQube
$SonarToken = Get-SonarQubeToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret

if (-not $SonarToken) {
    Write-Host "[ERREUR] Impossible de générer un token SonarQube. Abandon." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[INFO] Récupération de la liste des projets existants..." -ForegroundColor Green
$existingProjects = Get-SonarQubeProjects -SonarToken $SonarToken -SonarUrl $SonarUrl

# Projets à conserver
$projectsToKeep = @("service-formation", "d2f_api_gateway", "d2f_authentification", "d2f_besoin_formation", "d2f_certificat", "d2f_competence", "d2f_evaluation", "d2f_analyse", "d2f_webapp")

# Supprimer les projets en double ou obsolètes
Write-Host ""
Write-Host "[INFO] Nettoyage des projets en double ou obsolètes..." -ForegroundColor Green
foreach ($project in $existingProjects) {
    $projectKey = $project.key

    # Vérifier si le projet doit être supprimé
    if ($projectKey -eq "d2f_formation" -or $projectKey -eq "coded2f_formation") {
        Write-Host "  [DELETE] Projet en double trouvé: $projectKey" -ForegroundColor Red
        Remove-SonarQubeProject -ProjectKey $projectKey -SonarToken $SonarToken -SonarUrl $SonarUrl
    }
    elseif (-not ($projectsToKeep -contains $projectKey)) {
        Write-Host "  [DELETE] Projet obsolète trouvé: $projectKey" -ForegroundColor Yellow
        Remove-SonarQubeProject -ProjectKey $projectKey -SonarToken $SonarToken -SonarUrl $SonarUrl
    }
}

Write-Host ""
Write-Host "[INFO] Lancement de l'analyse complète de tous les services..." -ForegroundColor Green
Write-Host ""

# Lancer l'analyse complète de tous les services
& ".\scripts\run-all-sonar-tests.ps1" -SonarUrl $SonarUrl -SonarUser $SonarUser -SonarSecret $SonarSecret

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "[OK] Rafraîchissement du dashboard terminé !" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Accédez au dashboard SonarQube : $SonarUrl" -ForegroundColor Cyan
Write-Host ""

# Ouvrir automatiquement le dashboard
Write-Host "[INFO] Ouverture du dashboard SonarQube..." -ForegroundColor Yellow
Start-Process $SonarUrl
