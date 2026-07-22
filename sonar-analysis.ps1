# =============================================================================
# sonar-analysis.ps1 — Lance l'analyse SonarQube sur tous les services Java
# =============================================================================
# Usage :
#   .\sonar-analysis.ps1                 # Analyse de tous les services Java
#   .\sonar-analysis.ps1 auth-service    # Analyse d'un seul service
# =============================================================================
param(
    [string]$ServiceFilter = ""
)

$ErrorActionPreference = "Stop"
$SONAR_URL = "http://localhost:9000"
$SONAR_CONTAINER = "d2f-sonarqube"
$SONAR_TOKEN = "d2f_sqp_a1b2c3d4e5f6g7h8i9j0"

# ── Java services to analyse ─────────────────────────────────────────────────
$JAVA_SERVICES = @(
    @{ Name = "auth-service";                Dir = "esprit_D2F-authentification";   Key = "d2f-auth" },
    @{ Name = "competence-service";          Dir = "esprit_D2F-competence";         Key = "d2f-competence" },
    @{ Name = "besoin-formation-service";    Dir = "esprit_D2F-besoin-formation";   Key = "d2f-besoin-formation" },
    @{ Name = "certificat-service";          Dir = "esprit_D2F-certificat";         Key = "d2f-certificat" },
    @{ Name = "evaluation-service";          Dir = "esprit_D2F-evaluation";         Key = "d2f-evaluation" },
    @{ Name = "formation-service";           Dir = "esprit_D2F-formation";          Key = "d2f-formation" },
    @{ Name = "analyse-service";             Dir = "esprit_D2F-analyse";            Key = "d2f-analyse" },
    @{ Name = "notification-service";        Dir = "esprit_D2F-notification";       Key = "d2f-notification" },
    @{ Name = "api-gateway";                 Dir = "esprit_D2F-api-gateway";        Key = "d2f-api-gateway" },
    @{ Name = "common-security";             Dir = "esprit_D2F-common-security";    Key = "d2f-common-security" }
)

# ── Helper Functions ──────────────────────────────────────────────────────────

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "    ERROR: $msg" -ForegroundColor Red }

function Wait-SonarReady {
    param([int]$MaxWait = 300)
    Write-Step "Waiting for SonarQube to be ready..."
    $elapsed = 0
    while ($elapsed -lt $MaxWait) {
        try {
            $status = (Invoke-WebRequest -Uri "$SONAR_URL/api/system/status" -UseBasicParsing -TimeoutSec 5).Content | ConvertFrom-Json
            if ($status.status -eq "UP") {
                Write-OK "SonarQube is UP (took ${elapsed}s)"
                return $true
            }
        } catch {}
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "    ... waiting ($elapsed/${MaxWait}s)" -ForegroundColor DarkGray
    }
    Write-Err "SonarQube did not start within ${MaxWait}s"
    return $false
}

function Create-SonarToken {
    Write-Step "Generating SonarQube auth token..."
    try {
        # Try to create token via API (admin/admin default creds)
        $body = "name=d2f-analysis&type=GLOBAL_ANALYSIS_TOKEN&expiresIn=7d"
        $headers = @{ "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin")) }
        $resp = Invoke-WebRequest -Uri "$SONAR_URL/api/user_tokens/generate" -Method POST -Body $body -Headers $headers -UseBasicParsing -TimeoutSec 10
        $tokenData = $resp.Content | ConvertFrom-Json
        $script:SONAR_TOKEN = $tokenData.token
        Write-OK "Token created: $($tokenData.token)"
        return $true
    } catch {
        Write-Host "    Using default token: $SONAR_TOKEN" -ForegroundColor DarkYellow
        return $true
    }
}

function Invoke-SonarAnalysis {
    param(
        [string]$ProjectName,
        [string]$ProjectDir,
        [string]$ProjectKey
    )

    Write-Step "Analysing: $ProjectName (key=$ProjectKey)"

    $fullPath = Join-Path $PSScriptRoot $ProjectDir
    if (-not (Test-Path $fullPath)) {
        Write-Err "Directory not found: $fullPath"
        return $false
    }

    # Install sonar-maven-plugin via Maven Wrapper + run analysis
    $mvnw = Join-Path $fullPath "mvnw"
    if (-not (Test-Path $mvnw)) {
        $mvnw = Join-Path $fullPath "mvnw.cmd"
    }

    Write-Host "    Running: mvn sonar:sonar on $ProjectDir" -ForegroundColor DarkGray

    # Use docker run with maven to avoid local Java dependency
    $srcDir = (Resolve-Path $PSScriptRoot).Path

    $dockerArgs = @(
        "run", "--rm",
        "--network", "d2f-network",
        "-v", "${srcDir}:/src",
        "-w", "/src/$ProjectDir",
        "-e", "SONAR_HOST_URL=http://$SONAR_CONTAINER:9000",
        "-e", "SONAR_TOKEN=$SONAR_TOKEN",
        "maven:3.9-eclipse-temurin-17",
        "mvn", "clean", "verify",
        "org.sonarsource.scanner.maven:sonar-maven-plugin:5.1.0.4882:sonar",
        "-Dsonar.host.url=http://$SONAR_CONTAINER:9000",
        "-Dsonar.token=$SONAR_TOKEN",
        "-Dsonar.projectKey=$ProjectKey",
        "-Dsonar.projectName=$ProjectName",
        "-Dmaven.test.skip=true"
    )

    Write-Host "    docker $($dockerArgs[0..4] -join ' ') ..." -ForegroundColor DarkGray

    $proc = Start-Process -FilePath "docker" -ArgumentList $dockerArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\sonar_${ProjectKey}.log" -RedirectStandardError "$env:TEMP\sonar_${ProjectKey}_err.log"

    if ($proc.ExitCode -eq 0) {
        Write-OK "$ProjectName — analysis submitted successfully"
        return $true
    } else {
        $errLog = Get-Content "$env:TEMP\sonar_${ProjectKey}_err.log" -ErrorAction SilentlyContinue | Select-Object -Last 10
        Write-Err "$ProjectName — analysis failed (exit $($proc.ExitCode))"
        if ($errLog) { Write-Host ($errLog -join "`n") -ForegroundColor DarkRed }
        return $false
    }
}

# ── Main ──────────────────────────────────────────────────────────────────────

Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "  D2F — SonarQube Analysis Runner" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

# 1. Ensure SonarQube is running
Write-Step "Starting SonarQube container..."
docker compose --profile quality up -d sonarqube 2>$null | Out-Null

# 2. Wait for readiness
if (-not (Wait-SonarReady -MaxWait 300)) {
    Write-Err "Cannot proceed — SonarQube not ready. Check: docker logs $SONAR_CONTAINER"
    exit 1
}

# 3. Create token
Create-SonarToken

# 4. Filter services
$toAnalyse = $JAVA_SERVICES
if ($ServiceFilter) {
    $toAnalyse = $JAVA_SERVICES | Where-Object { $_.Name -match $ServiceFilter }
    if (-not $toAnalyse) {
        Write-Err "No service matches filter: $ServiceFilter"
        exit 1
    }
}

# 5. Run analysis for each service
$results = @{}
foreach ($svc in $toAnalyse) {
    $ok = Invoke-SonarAnalysis -ProjectName $svc.Name -ProjectDir $svc.Dir -ProjectKey $svc.Key
    $results[$svc.Name] = $ok
}

# 6. Summary
Write-Host "`n==============================================" -ForegroundColor Yellow
Write-Host "  ANALYSIS SUMMARY" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

$successCount = 0
$failCount = 0
foreach ($svc in $toAnalyse) {
    if ($results[$svc.Name]) {
        Write-Host "  OK   $($svc.Name)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  FAIL $($svc.Name)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`n  Total: $($toAnalyse.Count) | Success: $successCount | Failed: $failCount" -ForegroundColor Cyan
Write-Host "`n  Dashboard: $SONAR_URL" -ForegroundColor Cyan
Write-Host "  Login: admin / admin" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Yellow
