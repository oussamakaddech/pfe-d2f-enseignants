# =============================================================================
# sonar-full.ps1 - One-command SonarQube analysis for the D2F monorepo (Windows)
# =============================================================================
# Runs build + tests + sonar-scan for the 12 modules:
#   8 Java (Spring Boot via Maven + JaCoCo)
#   1 Web (React/Vite + Vitest + lcov)
#   3 Python (pytest + coverage + sonar-scanner)
#
# Usage:
#   powershell scripts/sonar-full.ps1
#   powershell scripts/sonar-full.ps1 -Only d2f_webapp
#   powershell scripts/sonar-full.ps1 -Only "d2f_rice,d2f_webapp"
#   powershell scripts/sonar-full.ps1 -SkipTests
#   powershell scripts/sonar-full.ps1 -JavaOnly | -PythonOnly | -WebOnly
#
# Env / params:
#   -SonarUrl   (default: http://localhost:9000)
#   -SonarToken (auto-generated if -SonarUser + -SonarPass supplied)
#   -SonarUser  (default: admin)
#   -SonarPass  (required for token bootstrap if -SonarToken is empty)
# =============================================================================
param(
    [string]   $SonarUrl   = $(if ($env:SONAR_URL)   { $env:SONAR_URL }   else { "http://localhost:9000" }),
    [string]   $SonarUser  = $(if ($env:SONAR_USER)  { $env:SONAR_USER }  else { "admin" }),
    [string]   $SonarPass  = $(if ($env:SONAR_PASS)  { $env:SONAR_PASS }  else { "" }),
    [string]   $SonarToken = $(if ($env:SONAR_TOKEN) { $env:SONAR_TOKEN } else { "" }),
    [string[]] $Only       = @(),
    [switch]   $SkipTests,
    [switch]   $SkipScan,
    [switch]   $JavaOnly,
    [switch]   $PythonOnly,
    [switch]   $WebOnly,
    [switch]   $NoSummary
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $PSScriptRoot ".sonar-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Allow comma-separated -Only "a,b"
if ($Only.Count -eq 1 -and $Only[0] -match ',') { $Only = $Only[0] -split ',' }

# -- Catalogue ----------------------------------------------------------------
$Modules = @(
    @{ Type="java";   Path="esprit_D2F-api-gateway";              Key="d2f_api_gateway" },
    @{ Type="java";   Path="esprit_D2F-authentification";         Key="d2f_authentification" },
    @{ Type="java";   Path="esprit_D2F-besoin-formation";         Key="d2f_besoin_formation" },
    @{ Type="java";   Path="esprit_D2F-certificat";               Key="d2f_certificat" },
    @{ Type="java";   Path="esprit_D2F-competence";               Key="d2f_competence" },
    @{ Type="java";   Path="esprit_D2F-evaluation";               Key="d2f_evaluation" },
    @{ Type="java";   Path="esprit_D2F-formation";                Key="d2f_formation" },
    @{ Type="java";   Path="esprit_D2F-analyse";                  Key="d2f_analyse" },
    @{ Type="web";    Path="esprit_D2F-webapp";                   Key="d2f_webapp" },
    @{ Type="python"; Path="esprit_D2F-rice";                     Key="d2f_rice" },
    @{ Type="python"; Path="esprit_D2F-predictive-analytics";     Key="d2f_predictive_analytics" }
)

# -- Helpers ------------------------------------------------------------------
function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function OK  ($m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[FAIL] $m" -ForegroundColor Red }

function Test-Wanted($mod) {
    if ($Only.Count -gt 0) {
        $wanted = @($mod.Key, $mod.Path)
        if (($Only | Where-Object { $wanted -contains $_ }).Count -eq 0) { return $false }
    }
    if ($JavaOnly   -and $mod.Type -ne "java")   { return $false }
    if ($PythonOnly -and $mod.Type -ne "python") { return $false }
    if ($WebOnly    -and $mod.Type -ne "web")    { return $false }
    return $true
}

function Get-RatingLetter($v) {
    try { return [char](64 + [int][double]$v) } catch { return '-' }
}

function Get-SonarReportTaskPath {
    param([hashtable]$Mod)
    return (Join-Path $Mod.Path ".scannerwork\report-task.txt")
}

function Wait-ForSonarTask {
    param(
        [string]$TaskId,
        [string]$Url,
        [string]$Token,
        [string]$LogPath,
        [int]$TimeoutSeconds = 600
    )

    $pair = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Token}:"))
    $headers = @{ Authorization = "Basic $pair" }
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-RestMethod -Headers $headers -Uri "$Url/api/ce/task?id=$TaskId"
            $task = $resp.task
            if ($task.status -eq 'SUCCESS') {
                if ($LogPath) { Write-LogLine $LogPath "[sonar] CE task $TaskId SUCCESS" }
                return $true
            }
            if ($task.status -in @('FAILED', 'CANCELED')) {
                $message = if ($task.errorMessage) { $task.errorMessage } else { "Sonar CE task $TaskId ended with status $($task.status)" }
                throw $message
            }
        } catch {
            if ($_.Exception.Message -notmatch '404') { throw }
        }
        Start-Sleep -Seconds 3
    }

    throw "Timeout while waiting for SonarQube task $TaskId"
}

function Wait-ForSonarCompletion {
    param([hashtable]$Mod, [string]$Token, [string]$Url, [string]$LogPath)

    $taskFile = Get-SonarReportTaskPath -Mod $Mod
    if (-not (Test-Path $taskFile)) {
        Warn "$($Mod.Key): report-task.txt not found, skipping CE wait"
        return $false
    }

    $props = @{}
    Get-Content $taskFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') { $props[$matches[1]] = $matches[2] }
    }

    if (-not $props.ContainsKey('ceTaskId')) {
        Warn "$($Mod.Key): report-task.txt missing ceTaskId, skipping CE wait"
        return $false
    }

    Write-LogLine $LogPath "[sonar] Waiting for CE task $($props['ceTaskId'])..."
    return (Wait-ForSonarTask -TaskId $props['ceTaskId'] -Url $Url -Token $Token -LogPath $LogPath)
}

# -- Prerequisites ------------------------------------------------------------
Info "Checking prerequisites..."
$missing = @()
foreach ($c in @("python")) {
    if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { $missing += $c }
}
if ($missing) { Fail "Missing commands: $($missing -join ', ')"; exit 2 }

# -- SonarQube reachability ---------------------------------------------------
Info "Pinging SonarQube at $SonarUrl ..."
try {
    $resp = Invoke-WebRequest -Uri "$SonarUrl/api/system/status" -UseBasicParsing -ErrorAction Stop
    $status = ($resp.Content | ConvertFrom-Json).status
    if ($status -ne "UP") { Fail "SonarQube status = $status (expected UP)"; exit 3 }
    OK "SonarQube is UP"
} catch {
    Fail "SonarQube unreachable: $($_.Exception.Message)"
    Fail "Start it: docker compose -f infra/sonarqube/docker-compose.yml up -d"
    exit 3
}

# -- Token bootstrap ----------------------------------------------------------
if (-not $SonarToken) {
    if (-not $SonarPass) {
        Fail "Provide -SonarToken or -SonarPass (default user=admin)."
        Write-Host "  Hint: powershell scripts/sonar-full.ps1 -SonarPass myadminpwd"
        exit 4
    }
    Info "Generating ephemeral analysis token via admin credentials..."
    $tokName = "full-analysis-$(Get-Date -Format yyyyMMddHHmmss)"
    $pair = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarUser}:${SonarPass}"))
    try {
        $r = Invoke-WebRequest -Method Post -UseBasicParsing -Headers @{ Authorization = "Basic $pair" } `
              -Uri "$SonarUrl/api/user_tokens/generate?name=$tokName"
        $SonarToken = ($r.Content | ConvertFrom-Json).token
        if (-not $SonarToken) { throw "no token in response" }
        OK "Token obtained ($tokName)"
    } catch {
        Fail "Token generation failed: $($_.Exception.Message)"
        exit 4
    }
}
$env:SONAR_TOKEN     = $SonarToken
$env:SONAR_HOST_URL  = $SonarUrl

# -- Runners ------------------------------------------------------------------
$Results = @()

function Write-LogLine($log, $line) { Add-Content -Path $log -Value $line }

function Invoke-Java($mod) {
    $log = Join-Path $LogDir "$($mod.Key).log"
    Set-Content -Path $log -Value ""
    $t0 = Get-Date
    $rc = 0
    Push-Location $mod.Path
    try {
        $mvn = if (Test-Path "./mvnw.cmd") { "./mvnw.cmd" } else { "mvn" }
        if (-not $SkipTests) {
            Write-LogLine $log "[$($mod.Key)] mvn clean verify (tests + JaCoCo)..."
            & $mvn -B -q clean verify -Dmaven.test.failure.ignore=true *>> $log
        }
        if (-not $SkipScan) {
            Write-LogLine $log "[$($mod.Key)] mvn sonar:sonar..."
            $scanArgs = @("-B", "-q", "sonar:sonar",
                      "-Dsonar.projectKey=$($mod.Key)",
                      "-Dsonar.host.url=$SonarUrl",
                      "-Dsonar.token=$SonarToken",
                      "-Dsonar.qualitygate.wait=false")
            & $mvn @scanArgs *>> $log
            $rc = $LASTEXITCODE
        }
    } finally { Pop-Location }
    $script:Results += [PSCustomObject]@{ Key=$mod.Key; Type=$mod.Type; RC=$rc; Elapsed=([int]((Get-Date) - $t0).TotalSeconds) }
    if ($rc -eq 0) { OK "$($mod.Key) (java) done" } else { Fail "$($mod.Key) (java) - see $log" }
}

function Invoke-Web($mod) {
    $log = Join-Path $LogDir "$($mod.Key).log"
    Set-Content -Path $log -Value ""
    $t0 = Get-Date
    $rc = 0
    Push-Location $mod.Path
    try {
        if (-not $SkipTests) {
            if (-not (Test-Path "node_modules")) {
                Write-LogLine $log "[$($mod.Key)] npm ci..."
                npm ci --legacy-peer-deps --silent *>> $log
            }
            Write-LogLine $log "[$($mod.Key)] vitest --coverage..."
            npx vitest run --coverage --reporter=basic *>> $log
        }
        if (-not $SkipScan) {
            if (-not (Get-Command sonar-scanner -ErrorAction SilentlyContinue)) {
                Write-LogLine $log "sonar-scanner missing - run: npm i -g sonarqube-scanner"
                $rc = 5
            } else {
                Write-LogLine $log "[$($mod.Key)] sonar-scanner..."
                $scanArgs = @("-Dsonar.projectKey=$($mod.Key)",
                          "-Dsonar.host.url=$SonarUrl",
                          "-Dsonar.token=$SonarToken",
                          "-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info",
                          "-Dsonar.qualitygate.wait=false")
                & sonar-scanner @scanArgs *>> $log
                $rc = $LASTEXITCODE
                if ($rc -eq 0) {
                    Wait-ForSonarCompletion -Mod $mod -Token $SonarToken -Url $SonarUrl -LogPath $log | Out-Null
                }
            }
        }
    } finally { Pop-Location }
    $script:Results += [PSCustomObject]@{ Key=$mod.Key; Type=$mod.Type; RC=$rc; Elapsed=([int]((Get-Date) - $t0).TotalSeconds) }
    if ($rc -eq 0) { OK "$($mod.Key) (web) done" } else { Fail "$($mod.Key) (web) - see $log" }
}

function Invoke-Python($mod) {
    $log = Join-Path $LogDir "$($mod.Key).log"
    Set-Content -Path $log -Value ""
    $t0 = Get-Date
    $rc = 0
    Push-Location $mod.Path
    try {
        if (-not $SkipTests) {
            Write-LogLine $log "[$($mod.Key)] pip install -r requirements.txt..."
            # Use the virtual environment Python if present
            $pyExe = if (Test-Path ".\\.venv\\Scripts\\python.exe") { ".venv\\Scripts\\python.exe" } else { "python" }
            & $pyExe -m pip install -q -r requirements.txt *>> $log
            & $pyExe -m pip install -q pytest pytest-cov *>> $log
            Write-LogLine $log "[$($mod.Key)] pytest --cov=rice..."
            # RICE_DISABLE_SEMANTIC=true prevents sentence-transformers from loading,
            # which avoids multi-minute hangs caused by building embeddings during tests.
            $env:RICE_DISABLE_SEMANTIC = "true"
            & $pyExe -m pytest --cov=rice --cov-report=xml:coverage.xml --junitxml=junit-results.xml *>> $log
            Remove-Item Env:\RICE_DISABLE_SEMANTIC -ErrorAction SilentlyContinue
        }
        if (-not $SkipScan) {
            if (-not (Get-Command sonar-scanner -ErrorAction SilentlyContinue)) {
                Write-LogLine $log "sonar-scanner missing - run: npm i -g sonarqube-scanner"
                $rc = 5
            } else {
                Write-LogLine $log "[$($mod.Key)] sonar-scanner..."
                $scanArgs = @("-Dsonar.projectKey=$($mod.Key)",
                          "-Dsonar.host.url=$SonarUrl",
                          "-Dsonar.token=$SonarToken",
                          "-Dsonar.qualitygate.wait=false")
                & sonar-scanner @scanArgs *>> $log
                $rc = $LASTEXITCODE
                if ($rc -eq 0) {
                    Wait-ForSonarCompletion -Mod $mod -Token $SonarToken -Url $SonarUrl -LogPath $log | Out-Null
                }
            }
        }
    } finally { Pop-Location }
    $script:Results += [PSCustomObject]@{ Key=$mod.Key; Type=$mod.Type; RC=$rc; Elapsed=([int]((Get-Date) - $t0).TotalSeconds) }
    if ($rc -eq 0) { OK "$($mod.Key) (python) done" } else { Fail "$($mod.Key) (python) - see $log" }
}

# -- Main loop ----------------------------------------------------------------
Write-Host ""
Info "Monorepo D2F - SonarQube full analysis"
Info "URL: $SonarUrl   Logs: $LogDir"
if ($Only.Count -gt 0) { Info "Filter -Only: $($Only -join ', ')" }
if ($SkipTests) { Info "Skipping tests" }
if ($SkipScan)  { Info "Skipping scans" }
Write-Host ""

$tStart = Get-Date
foreach ($mod in $Modules) {
    if (-not (Test-Wanted $mod)) { continue }
    if (-not (Test-Path $mod.Path)) { Warn "$($mod.Key): directory $($mod.Path) not found, skipping"; continue }
    Write-Host "--- $($mod.Key) ($($mod.Type)) --------------------------------------------"
    switch ($mod.Type) {
        "java"   { $Results = Invoke-Java   $mod }
        "web"    { $Results = Invoke-Web    $mod }
        "python" { $Results = Invoke-Python $mod }
    }
}
$tEnd = Get-Date
Write-Host ""
Info "Total elapsed: $([int]($tEnd - $tStart).TotalSeconds)s"

if ($NoSummary -or $SkipScan) {
    Write-Host ("{0,-32} {1,-8} {2}" -f "Project","Status","Elapsed(s)")
    foreach ($r in $Results) {
        $st = if ($r.RC -eq 0) { "OK" } else { "FAIL" }
        Write-Host ("{0,-32} {1,-8} {2}" -f $r.Key, $st, $r.Elapsed)
    }
    exit 0
}

Info "Reading SonarQube measures after CE completion..."

Write-Host ""
Write-Host ("{0,-32} | {1,-4} {2}" -f "Project","QG","Rel Sec Mai HotRev | Bugs Vulns Smells Cov%")
Write-Host ("-" * 95)
$globalRC = 0
$tokenPair = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarToken}:"))
foreach ($mod in $Modules) {
    if (-not (Test-Wanted $mod)) { continue }
    try {
        $u = "$SonarUrl/api/measures/component?component=$($mod.Key){0}metricKeys=alert_status,reliability_rating,security_rating,sqale_rating,security_review_rating,bugs,vulnerabilities,code_smells,coverage" -f '&'
        $r = Invoke-WebRequest -UseBasicParsing -Headers @{ Authorization = "Basic $tokenPair" } -Uri $u
        $c = ($r.Content | ConvertFrom-Json).component
        $ms = @{}; foreach ($m in $c.measures) { $ms[$m.metric] = $m.value }
        $qg   = if ($ms.ContainsKey('alert_status')) { $ms['alert_status'] } else { '-' }
        $rel  = Get-RatingLetter $ms['reliability_rating']
        $sec  = Get-RatingLetter $ms['security_rating']
        $mai  = Get-RatingLetter $ms['sqale_rating']
        $hot  = Get-RatingLetter $ms['security_review_rating']
        $bugs   = if ($ms.ContainsKey('bugs'))            { $ms['bugs'] }            else { '-' }
        $vulns  = if ($ms.ContainsKey('vulnerabilities')) { $ms['vulnerabilities'] } else { '-' }
        $smells = if ($ms.ContainsKey('code_smells'))     { $ms['code_smells'] }     else { '-' }
        $cov    = if ($ms.ContainsKey('coverage'))        { $ms['coverage'] }        else { '-' }
        if ($qg -eq 'OK') { $icon = 'OK ' } else { $icon = 'KO!'; $globalRC = 1 }
        Write-Host ("{0} {1,-30} | {2,-4} {3,3} {4,3} {5,3} {6,5}  | {7,4}  {8,4} {9,6}  {10,5}" `
            -f $icon, $mod.Key, $qg, $rel, $sec, $mai, $hot, $bugs, $vulns, $smells, $cov)
    } catch {
        Warn "$($mod.Key): unable to read measures ($_)"
    }
}

Write-Host ""
if ($globalRC -eq 0) {
    OK  "All Quality Gates PASS"
    Write-Host "Dashboard: $SonarUrl/projects?gate=OK"
} else {
    Fail "At least one Quality Gate failed"
    Write-Host "Dashboard: $SonarUrl/projects"
}
exit $globalRC
