# =============================================================================
# run-all-sonar-tests.ps1 - Analyse SonarQube de TOUS les modules du monorepo
# Java (Maven + JaCoCo) + Webapp (Vite + Vitest + lcov) + Python (pytest + cov)
# =============================================================================
param(
    [string]$SonarUrl = "http://localhost:9000",
    [string]$SonarUser = "admin",
    [SecureString]$SonarSecret = ("0710oussamA@" | ConvertTo-SecureString -AsPlainText -Force),
    [string[]]$Only = @()  # ex: -Only @("esprit_D2F-webapp")
)

$ErrorActionPreference = "Stop"

# --- Catalogue des modules ---
$javaModules = @(
    @{ Path = "esprit_D2F-api-gateway";       Key = "d2f_api_gateway" },
    @{ Path = "esprit_D2F-authentification";  Key = "d2f_authentification" },
    @{ Path = "esprit_D2F-besoin-formation";  Key = "d2f_besoin_formation" },
    @{ Path = "esprit_D2F-certificat";        Key = "d2f_certificat" },
    @{ Path = "esprit_D2F-competence";        Key = "d2f_competence" },
    @{ Path = "esprit_D2F-evaluation";        Key = "d2f_evaluation" },
    @{ Path = "esprit_D2F-formation";         Key = "d2f_formation" },
    @{ Path = "esprit_D2F-analyse";           Key = "d2f_analyse" }
)

$webModules = @(
    @{ Path = "esprit_D2F-webapp"; Key = "d2f_webapp" }
)

$pythonModules = @(
    @{ Path = "esprit_D2F-rice";                     Key = "d2f_rice" },
    @{ Path = "esprit_D2F-predictive-analytics";     Key = "d2f_predictive_analytics" },
    @{ Path = "esprit_D2F-recommandation-formateur"; Key = "d2f_recommandation_formateur" }
)

# --- Helpers ---
function Get-SonarToken {
    param([string]$Url, [string]$Username, [SecureString]$Secret)
    $pwd = [System.Net.NetworkCredential]::new("", $Secret).Password
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:$pwd"))
    $tokenName = "monorepo-scanner-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $headers = @{ Authorization = "Basic $auth"; "Content-Type" = "application/json" }
    $resp = Invoke-WebRequest -Uri "$Url/api/user_tokens/generate?name=$tokenName" -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
    return ($resp.Content | ConvertFrom-Json).token
}

function Test-Wanted {
    param([string]$ModulePath)
    if ($Only.Count -eq 0) { return $true }
    return $Only -contains $ModulePath
}

function Invoke-JavaAnalysis {
    param([hashtable]$Mod, [string]$Token, [string]$Url)
    if (-not (Test-Wanted $Mod.Path)) { return $null }
    if (-not (Test-Path "$($Mod.Path)/pom.xml")) {
        Write-Host "  [SKIP] $($Mod.Path) (pas de pom.xml)" -ForegroundColor Yellow
        return $false
    }
    Write-Host ""
    Write-Host "[Java] $($Mod.Path)" -ForegroundColor Cyan
    Push-Location $Mod.Path
    try {
        $mvnCmd = if (Test-Path "mvnw.cmd") { ".\mvnw.cmd" } else { "mvn" }
        Write-Host "  [1/2] verify (tests + JaCoCo)..."
        & $mvnCmd -B -q clean verify
        if ($LASTEXITCODE -ne 0) { throw "Maven verify failed" }
        Write-Host "  [2/2] sonar:sonar..."
        & $mvnCmd -B -q sonar:sonar `
            "-Dsonar.projectKey=$($Mod.Key)" `
            "-Dsonar.host.url=$Url" `
            "-Dsonar.login=$Token" `
            "-Dsonar.qualitygate.wait=true"
        if ($LASTEXITCODE -ne 0) { throw "Sonar scan failed (Quality Gate ?)" }
        Write-Host "  [OK] $($Mod.Path)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [ERREUR] $($Mod.Path) : $_" -ForegroundColor Red
        return $false
    } finally { Pop-Location }
}

function Invoke-WebAnalysis {
    param([hashtable]$Mod, [string]$Token, [string]$Url)
    if (-not (Test-Wanted $Mod.Path)) { return $null }
    Write-Host ""
    Write-Host "[Web]  $($Mod.Path)" -ForegroundColor Cyan
    Push-Location $Mod.Path
    try {
        Write-Host "  [1/3] npm ci..."
        npm ci --legacy-peer-deps --silent
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        Write-Host "  [2/3] tests + coverage..."
        npm run test:coverage 2>&1 | Out-Null  # ne pas bloquer si fail, laisser Sonar décider
        Write-Host "  [3/3] sonar-scanner..."
        if (-not (Get-Command sonar-scanner -ErrorAction SilentlyContinue)) {
            throw "sonar-scanner introuvable dans le PATH"
        }
        & sonar-scanner `
            "-Dsonar.projectKey=$($Mod.Key)" `
            "-Dsonar.host.url=$Url" `
            "-Dsonar.login=$Token" `
            "-Dsonar.qualitygate.wait=true"
        if ($LASTEXITCODE -ne 0) { throw "Sonar scan failed (Quality Gate ?)" }
        Write-Host "  [OK] $($Mod.Path)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [ERREUR] $($Mod.Path) : $_" -ForegroundColor Red
        return $false
    } finally { Pop-Location }
}

function Invoke-PythonAnalysis {
    param([hashtable]$Mod, [string]$Token, [string]$Url)
    if (-not (Test-Wanted $Mod.Path)) { return $null }
    Write-Host ""
    Write-Host "[Py]   $($Mod.Path)" -ForegroundColor Cyan
    Push-Location $Mod.Path
    try {
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
            throw "python introuvable dans le PATH"
        }
        Write-Host "  [1/3] pip install..."
        python -m pip install -q -r requirements.txt
        python -m pip install -q pytest pytest-cov
        Write-Host "  [2/3] pytest + coverage..."
        python -m pytest --cov=. --cov-report=xml --junit-xml=junit-results.xml 2>&1 | Out-Null
        Write-Host "  [3/3] sonar-scanner..."
        if (-not (Get-Command sonar-scanner -ErrorAction SilentlyContinue)) {
            throw "sonar-scanner introuvable dans le PATH"
        }
        & sonar-scanner `
            "-Dsonar.projectKey=$($Mod.Key)" `
            "-Dsonar.host.url=$Url" `
            "-Dsonar.login=$Token" `
            "-Dsonar.qualitygate.wait=true"
        if ($LASTEXITCODE -ne 0) { throw "Sonar scan failed (Quality Gate ?)" }
        Write-Host "  [OK] $($Mod.Path)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [ERREUR] $($Mod.Path) : $_" -ForegroundColor Red
        return $false
    } finally { Pop-Location }
}

# --- Point d'entrée ---
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " Analyse SonarQube monorepo D2F " -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " URL  : $SonarUrl"
Write-Host " User : $SonarUser"
if ($Only.Count -gt 0) { Write-Host " Filtre : $($Only -join ', ')" -ForegroundColor Yellow }
Write-Host ""

# Sanity check
try {
    $null = Invoke-WebRequest -Uri "$SonarUrl/api/system/status" -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host "[ERREUR] SonarQube injoignable à $SonarUrl" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Génération du token SonarQube..."
$token = Get-SonarToken -Url $SonarUrl -Username $SonarUser -Secret $SonarSecret
if (-not $token) { Write-Host "[ERREUR] Token impossible" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Token obtenu" -ForegroundColor Green

$ok = 0; $ko = 0; $skip = 0
foreach ($m in $javaModules)   { $r = Invoke-JavaAnalysis   -Mod $m -Token $token -Url $SonarUrl; if ($r -eq $true) { $ok++ } elseif ($r -eq $false) { $ko++ } else { $skip++ } }
foreach ($m in $webModules)    { $r = Invoke-WebAnalysis    -Mod $m -Token $token -Url $SonarUrl; if ($r -eq $true) { $ok++ } elseif ($r -eq $false) { $ko++ } else { $skip++ } }
foreach ($m in $pythonModules) { $r = Invoke-PythonAnalysis -Mod $m -Token $token -Url $SonarUrl; if ($r -eq $true) { $ok++ } elseif ($r -eq $false) { $ko++ } else { $skip++ } }

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " Résumé : $ok OK / $ko KO / $skip skipped" -ForegroundColor Green
Write-Host " Dashboard : $SonarUrl" -ForegroundColor Cyan
Write-Host "==============================================================="
if ($ko -gt 0) { exit 1 } else { exit 0 }
