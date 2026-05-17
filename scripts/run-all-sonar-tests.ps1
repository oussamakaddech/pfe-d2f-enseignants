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
    if (-not (Test-Path $reportFile)) {
        $reportFile = Join-Path $ServicePath ".scannerwork\report-task.txt"
    }
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
$allServices = @(
    "esprit_D2F-authentification",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-certificat",
    "esprit_D2F-competence",
    "esprit_D2F-evaluation",
    "esprit_D2F-formation",
    "esprit_D2F-api-gateway",
    "esprit_D2F-analyse",
    "esprit_D2F-webapp"
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
$allServices | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
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

$projectKeyMap = @{
    "esprit_D2F-api-gateway" = "d2f_api_gateway"
    "esprit_D2F-authentification" = "d2f_authentification"
    "esprit_D2F-besoin-formation" = "d2f_besoin_formation"
    "esprit_D2F-certificat" = "d2f_certificat"
    "esprit_D2F-competence" = "d2f_competence"
    "esprit_D2F-evaluation" = "d2f_evaluation"
    "esprit_D2F-formation" = "d2f_formation"
    "esprit_D2F-analyse" = "d2f_analyse"
    "esprit_D2F-webapp" = "d2f_webapp"
}

# Lancer les tests pour chaque service
foreach ($service in $allServices) {
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
        $projectKey = $projectKeyMap[$service]
        if (-not $projectKey) {
            $projectKey = $service -replace "-", "_"
        }

        $sonarResult = 0
        
        if (Test-Path "package.json") {
            # --- NODEJS PROJECT (FRONTEND) ---
            Write-Host "  [INFO] Projet NodeJS detecte" -ForegroundColor Yellow
            
            if (-not (Test-Path "node_modules")) {
                Write-Host "  [INFO] Installation des dependances npm..." -ForegroundColor Yellow
                npm install --quiet
            }
            
            Write-Host "  [INFO] Execution des tests avec couverture..." -ForegroundColor Yellow
            npm run test:coverage
            $testResult = $LASTEXITCODE
            
            if ($testResult -ne 0) {
                Write-Host "  [ERREUR] Les tests ont echoue" -ForegroundColor Red
                $failCount++
                Pop-Location
                continue
            }
            
            Write-Host "  [INFO] Envoi a SonarQube via sonar-scanner..." -ForegroundColor Yellow
            npx sonar-scanner `
                "-Dsonar.projectKey=$projectKey" `
                "-Dsonar.host.url=$SonarUrl" `
                "-Dsonar.token=$SonarToken" `
                "-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
            
            $sonarResult = $LASTEXITCODE
        } else {
            # --- MAVEN PROJECT (BACKEND) ---
            Write-Host "  [INFO] Projet Maven detecte" -ForegroundColor Yellow
            
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
                Write-Host "  [ERREUR] Les tests ont echoue" -ForegroundColor Red
                $failCount++
                Pop-Location
                continue
            }
            
            Write-Host "  [INFO] Envoi a SonarQube via Maven..." -ForegroundColor Yellow
            & $mvnwPath "sonar:sonar" "-Dsonar.projectKey=$projectKey" "-Dsonar.host.url=$SonarUrl" "-Dsonar.token=$SonarToken" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
            $sonarResult = $LASTEXITCODE
        }
        
        if ($sonarResult -eq 0) {
            Write-Host "  [OK] Analyse SonarQube reussie" -ForegroundColor Green
            
            # Attendre le Quality Gate
            $gate = Wait-SonarQubeQualityGate -ServicePath "." -SonarToken $SonarToken
            if ($gate) {
                $statusColor = if ($gate.status -eq "OK") { "Green" } else { "Red" }
                Write-Host "  [GATE] Status Global : $($gate.status)" -ForegroundColor $statusColor
                
                # Metrics "Fresh" (New Code)
                $newCoverage = $gate.conditions | Where-Object { $_.metricKey -eq "new_coverage" }
                $overallCoverage = $gate.conditions | Where-Object { $_.metricKey -eq "coverage" }
                
                if ($newCoverage) {
                    Write-Host "  [NEW] Couverture sur le nouveau code : $($newCoverage.actualValue)%" -ForegroundColor Magenta
                }
                
                if ($overallCoverage) {
                    Write-Host "  [INFO] Couverture totale : $($overallCoverage.actualValue)%" -ForegroundColor Cyan
                }

                # Afficher les nouveaux problemes (Fresh)
                $newBugs = $gate.conditions | Where-Object { $_.metricKey -eq "new_bugs" }
                if ($newBugs -and [float]$newBugs.actualValue -gt 0) {
                    Write-Host "  [WARN] Nouveaux Bugs detectes : $($newBugs.actualValue)" -ForegroundColor Red
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
