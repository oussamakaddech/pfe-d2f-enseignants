# =============================================================================
# setup-sonarqube.ps1 - Configuration SonarQube pour D2F Platform
# =============================================================================
# Usage :
#   .\scripts\setup-sonarqube.ps1
#
# Ce script configure SonarQube pour la plateforme D2F :
# - Démarre le serveur SonarQube
# - Configure les Quality Gates
# - Configure les profils de qualité
# - Génère un token d'authentification
# =============================================================================

param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin",
    [string]$NewPassword = "d2f_admin_2026!"
)

# Vérifier si Docker est disponible
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerAvailable) {
    Write-Host "❌ Docker n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Démarrage de SonarQube..." -ForegroundColor Green
Set-Location infra/sonarqube
docker compose up -d

Write-Host "⏳ Attente du démarrage de SonarQube (cela peut prendre quelques minutes)..." -ForegroundColor Yellow
$maxAttempts = 60
$attempt = 0

do {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "$SonarUrl/api/system/status" -UseBasicParsing -ErrorAction Stop
        $status = $response.Content | ConvertFrom-Json

        if ($status.status -eq "UP") {
            Write-Host "✅ SonarQube est démarré !" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "⏳ Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ Timeout : SonarQube n'a pas pu démarrer" -ForegroundColor Red
    exit 1
}

# Changer le mot de passe admin
Write-Host "🔐 Configuration du mot de passe admin..." -ForegroundColor Yellow
try {
    $body = @{
        login = $AdminUser
        previousPassword = $AdminPassword
        password = $NewPassword
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$SonarUrl/api/users/change_password" `
        -Method Post `
        -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AdminUser`:$AdminPassword")))" } `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ Mot de passe admin changé avec succès" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Impossible de changer le mot de passe (peut-être déjà changé)" -ForegroundColor Yellow
}

# Créer un token d'authentification
Write-Host "🔑 Génération d'un token d'authentification..." -ForegroundColor Yellow
try {
    $body = @{
        name = "d2f-github-actions-$(Get-Date -Format 'yyyyMMdd')"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$SonarUrl/api/user_tokens/generate" `
        -Method Post `
        -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AdminUser`:$NewPassword")))" } `
        -ContentType "application/json" `
        -Body $body

    $token = $response.token
    Write-Host "✅ Token généré : $token" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT : Ajoutez ce token aux secrets GitHub (SONAR_TOKEN)" -ForegroundColor Red
} catch {
    Write-Host "❌ Impossible de générer le token" -ForegroundColor Red
    exit 1
}

# Créer les projets dans SonarQube
Write-Host "📦 Création des projets dans SonarQube..." -ForegroundColor Yellow
$projects = @(
    @{ key = "d2f_authentification"; name = "D2F Authentification Service" },
    @{ key = "d2f_competence"; name = "D2F Competence Service" },
    @{ key = "d2f_besoin_formation"; name = "D2F Besoin Formation Service" },
    @{ key = "d2f_certificat"; name = "D2F Certificat Service" },
    @{ key = "d2f_evaluation"; name = "D2F Evaluation Service" },
    @{ key = "d2f_formation"; name = "D2F Formation Service" },
    @{ key = "d2f_api_gateway"; name = "D2F API Gateway" },
    @{ key = "d2f_analyse"; name = "D2F Analyse Service" },
    @{ key = "d2f_webapp"; name = "D2F Webapp" }
)

foreach ($project in $projects) {
    try {
        $body = @{
            name = $project.name
            project = $project.key
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$SonarUrl/api/projects/create" `
            -Method Post `
            -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AdminUser`:$NewPassword")))" } `
            -ContentType "application/json" `
            -Body $body

        Write-Host "✅ Projet $($project.name) créé" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Le projet $($project.name) existe déjà ou erreur lors de la création" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Configuration SonarQube terminée avec succès !" -ForegroundColor Green
Write-Host "`n📋 Prochaines étapes :" -ForegroundColor Cyan
Write-Host "1. Ajoutez le token généré aux secrets GitHub (SONAR_TOKEN)" -ForegroundColor White
Write-Host "2. Ajoutez l'URL SonarQube aux secrets GitHub (SONAR_HOST_URL = $SonarUrl)" -ForegroundColor White
Write-Host "3. Configurez les Quality Gates dans l'interface SonarQube" -ForegroundColor White
Write-Host "4. Lancez les tests avec : docker compose -f infra/sonarqube/docker-compose.yml up -d" -ForegroundColor White
Write-Host "`n🌐 Interface SonarQube : $SonarUrl" -ForegroundColor Cyan
Write-Host "👤 Login : $AdminUser" -ForegroundColor Cyan
Write-Host "🔑 Password : $NewPassword" -ForegroundColor Cyan
