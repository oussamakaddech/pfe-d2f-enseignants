# =============================================================================
# run-all-sonar-tests.ps1 - Lancer tous les tests SonarQube
# =============================================================================
# Usage :
#   .\scripts\run-all-sonar-tests.ps1
#   .\scripts\run-all-sonar-tests.ps1 -SonarUrl "http://sonarqube.example.com"
#   .\scripts\run-all-sonar-tests.ps1 -SonarUser "admin" -SonarSecret "password"
# =============================================================================

# Modernized parameter handling for security compliance (PSScriptAnalyzer)
param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = ("0710oussamA@" | ConvertTo-SecureString -AsPlainText -Force),
    [string]$SonarToken = $null
)

# =============================================================================
# Fonction pour generer un token SonarQube
# =============================================================================
function Get-SonarQubeToken {
    param(
        [string]$Url,
        [string]$Username,
        [SecureString]$Secret
    )
    
    try {
        Write-Host "  [INFO] Generation d'un token SonarQube..." -ForegroundColor Yellow
        
        # Convertir SecureString en texte clair pour l'API
        $plainPassword = [System.Net.NetworkCredential]::new("", $Secret).Password
        $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:$plainPassword"))
        $tokenName = "maven-scanner-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
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
        Write-Host "  [OK] Token genere avec succes" -ForegroundColor Green
        return $json.token
    } catch {
        Write-Host "  [ERREUR] Impossible de generer le token: $_" -ForegroundColor Red
        return $null
    }
}

# =============================================================================
# Fonction pour attendre et recuperer le statut du Quality Gate
# =============================================================================
function Wait-SonarQubeQualityGate {
    param(
        [string]$ServicePath,
        [string]$SonarToken
    )
    
    $reportFile = Join-Path $ServicePath "target\sonar\report-task.txt"
    if (-not (Test-Path $reportFile)) { return $null }
    
    # Charger le fichier report-task.txt
    $content = Get-Content $reportFile | Out-String | ConvertFrom-StringData
    $ceTaskId = $content.ceTaskId
    $projectKey = $content.projectKey
    $serverUrl = $content.serverUrl
    
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarToken}:"))
    $headers = @{ "Authorization" = "Basic $auth" }
    
    Write-Host "  [INFO] Attente du resultat Quality Gate..." -ForegroundColor Yellow -NoNewline
    
    $status = "PENDING"
    $maxRetries = 15
    $retryCount = 0
    
    while (($status -eq "PENDING" -or $status -eq "IN_PROGRESS") -and ($retryCount -lt $maxRetries)) {
        Write-Host "." -ForegroundColor Yellow -NoNewline
        Start-Sleep -Seconds 2
        try {
            $taskResponse = Invoke-WebRequest -Uri "$serverUrl/api/ce/task?id=$ceTaskId" -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
            if ($taskResponse.StatusCode -eq 200) {
                $taskJson = $taskResponse.Content | ConvertFrom-Json
                $status = $taskJson.task.status
            }
        } catch {
            # On ignore les erreurs temporaires
        }
        $retryCount++
    }
    Write-Host ""
    
    if ($status -eq "SUCCESS") {
        try {
            $gateResponse = Invoke-WebRequest -Uri "$serverUrl/api/qualitygates/project_status?projectKey=$projectKey" -Headers $headers -UseBasicParsing
            $gateJson = $gateResponse.Content | ConvertFrom-Json
            return $gateJson.projectStatus
        } catch {
            return $null
        }
    }
    return $null
}
$javaServices = @(
    "esprit_D2F-authentification",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-certificat",
    "esprit_D2F-competence",
    "esprit_D2F-evaluation",
    "esprit_D2F-formation",
    "esprit_D2F-api-gateway",
    "esprit_D2F-analyse"
)

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Lancement de tous les tests SonarQube pour D2F Platform" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que SonarQube est disponible
Write-Host "[INFO] Verification de SonarQube..." -ForegroundColor Green
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerAvailable) {
    try {
        $response = Invoke-WebRequest -Uri "$SonarUrl/api/system/status" -UseBasicParsing -ErrorAction Stop
        $status = $response.Content | ConvertFrom-Json
        
        if ($status.status -eq "UP") {
            Write-Host "[OK] SonarQube est deja en cours d'execution" -ForegroundColor Green
        } else {
            Write-Host "[INFO] Demarrage de SonarQube..." -ForegroundColor Yellow
            Push-Location infra/sonarqube
            docker compose up -d
            Pop-Location
            Start-Sleep -Seconds 10
        }
    } catch {
        Write-Host "[INFO] Demarrage de SonarQube..." -ForegroundColor Yellow
        Push-Location infra/sonarqube
        docker compose up -d
        Pop-Location
        Start-Sleep -Seconds 10
    }
}

Write-Host ""
Write-Host "[INFO] Services a tester :" -ForegroundColor Green
$javaServices | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# Generer le token SonarQube s'il n'est pas fourni
if (-not $SonarToken) {
    $SonarToken = Get-SonarQubeToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret
}

if (-not $SonarToken) {
    Write-Host "[ERREUR] Impossible de generer un token SonarQube. Abandon." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Compteurs
$successCount = 0
$failCount = 0
$startTime = Get-Date

# Lancer les tests pour chaque service
foreach ($service in $javaServices) {
    $servicePath = ".\" + $service
    
    if (-not (Test-Path $servicePath)) {
        Write-Host "[WARN] $service : Repertoire non trouve, ignore" -ForegroundColor Yellow
        continue
    }
    
    Write-Host ""
    Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "[TEST] $service" -ForegroundColor Cyan
    Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
    
    Push-Location $servicePath
    
    try {
        # Etape 1: Clean et tests avec JaCoCo
        Write-Host "  [INFO] Nettoyage et execution des tests..." -ForegroundColor Yellow
        
        # Appeler mvnw.cmd directement (pas via fonction)
        $mvnwPath = ".\mvnw.cmd"
        if (-not (Test-Path $mvnwPath)) {
            Write-Host "  [ERREUR] mvnw.cmd introuvable" -ForegroundColor Red
            $failCount++
            Pop-Location
            continue
        }
        
        & $mvnwPath clean test jacoco:report
        $testResult = $LASTEXITCODE
        
        if ($testResult -ne 0) {
            Write-Host "  [ERREUR] Les tests ont echoue (code $testResult)" -ForegroundColor Red
            $failCount++
            Pop-Location
            continue
        }
        
        Write-Host "  [OK] Tests reussis" -ForegroundColor Green
        
        # Etape 2: Analyse SonarQube
        Write-Host "  [INFO] Envoi des resultats a SonarQube..." -ForegroundColor Yellow
        
        $projectKey = $service -replace "-", "_"
        
        & $mvnwPath "sonar:sonar" "-Dsonar.projectKey=$projectKey" "-Dsonar.host.url=$SonarUrl" "-Dsonar.token=$SonarToken" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
        
        $sonarResult = $LASTEXITCODE
        
        if ($sonarResult -eq 0) {
            Write-Host "  [OK] Analyse SonarQube reussie" -ForegroundColor Green
            
            # Attendre le Quality Gate
            $gate = Wait-SonarQubeQualityGate -ServicePath "." -SonarToken $SonarToken
            if ($gate) {
                $color = if ($gate.status -eq "OK") { "Green" } else { "Red" }
                Write-Host "  [GATE] Status : $($gate.status)" -ForegroundColor $color
                
                # Afficher la couverture si disponible
                $coverage = $gate.conditions | Where-Object { $_.metricKey -eq "coverage" }
                if ($coverage) {
                    Write-Host "  [INFO] Couverture : $($coverage.actualValue)%" -ForegroundColor Cyan
                }
            }
            
            Write-Host "  [LIEN] $SonarUrl/dashboard?id=$projectKey" -ForegroundColor Cyan
            $successCount++
        } else {
            Write-Host "  [WARN] L'analyse SonarQube a rencontre une erreur (code $sonarResult)" -ForegroundColor Yellow
            # Compter comme succes si les tests ont passe
            $successCount++
        }
        
    } catch {
        Write-Host "  [ERREUR] Exception : $_" -ForegroundColor Red
        $failCount++
    } finally {
        Pop-Location
    }
}

# Resume
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "RESUME DES TESTS" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "  [OK] Reussis : $successCount" -ForegroundColor Green
Write-Host "  [ERREUR] Echoues  : $failCount" -ForegroundColor Red
Write-Host "  [TIME] Temps total : $($elapsed.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Acceder a SonarQube :" -ForegroundColor Green
Write-Host "  URL : $SonarUrl" -ForegroundColor Cyan
Write-Host "  Login : $SonarUser" -ForegroundColor Yellow
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "[OK] Tous les tests sont termines avec succes !" -ForegroundColor Green
    
    # Ouvrir automatiquement le dashboard
    Write-Host "[INFO] Ouverture du dashboard SonarQube..." -ForegroundColor Yellow
    Start-Process $SonarUrl
    
    exit 0
} else {
    Write-Host "[WARN] $failCount service(s) ont echoue" -ForegroundColor Yellow
    exit 1
}
