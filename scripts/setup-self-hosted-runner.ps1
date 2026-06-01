<#
setup-self-hosted-runner.ps1

Description:
  Télécharge et configure un GitHub Actions self-hosted runner sur Windows,
  installe le service et le démarre. Conçu pour être exécuté en tant qu'Administrateur.

Usage:
  PowerShell (exécuter en Administrateur) :
    PowerShell -ExecutionPolicy Bypass -File .\scripts\setup-self-hosted-runner.ps1 \
      -RepoOwner <OWNER> -RepoName <REPO> -RunnerToken <RUNNER_TOKEN>

Notes:
  - Récupère automatiquement la dernière release du runner depuis GitHub API.
  - Le "RunnerToken" est généré depuis GitHub lors de l'ajout d'un nouveau runner (Settings → Actions → Runners → New self-hosted runner).
  - Le script installe le runner comme service Windows (svc install / svc start).
#>

Param(
  [Parameter(Mandatory=$true)] [string]$RepoOwner,
  [Parameter(Mandatory=$true)] [string]$RepoName,
  [Parameter(Mandatory=$false)] [string]$RunnerToken,
  [string]$RunnerLabels = "self-hosted,sonar",
  [string]$RunnerVersion = "2.308.0",
  [string]$WorkDir = "$PSScriptRoot\actions-runner"
)

function Test-IsAdmin {
  $current = [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
  return $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Warning "Ce script doit être lancé en tant qu'Administrateur. Ouvre PowerShell en mode Admin et relance le script."
  exit 1
}

if (-not $RunnerToken) {
  $RunnerToken = Read-Host -AsSecureString "Enter RUNNER_TOKEN (paste the token from GitHub UI)" | ConvertFrom-SecureString -AsPlainText
  if (-not $RunnerToken) { Write-Error "Runner token requis. Génère un token depuis GitHub UI (New self-hosted runner)."; exit 1 }
}

$RepoUrl = "https://github.com/$RepoOwner/$RepoName"

# Récupérer l'URL de téléchargement la plus récente (fallback sur la version fournie)
$downloadUrl = $null
try {
  Write-Host "Querying GitHub API for latest runner release..."
  $headers = @{ 'User-Agent' = 'PowerShell' }
  $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest" -Headers $headers -ErrorAction Stop
  $asset = $latest.assets | Where-Object { $_.name -like "actions-runner-win-x64-*.zip" } | Select-Object -First 1
  if ($asset -and $asset.browser_download_url) {
    $downloadUrl = $asset.browser_download_url
    Write-Host "Found latest runner: $($asset.name)"
  }
} catch {
  Write-Warning "Could not query GitHub API for latest release: $_"
}

if (-not $downloadUrl) {
  $downloadUrl = "https://github.com/actions/runner/releases/download/v$RunnerVersion/actions-runner-win-x64-$RunnerVersion.zip"
  Write-Host "Falling back to $downloadUrl"
}

$zipPath = Join-Path $env:TEMP "actions-runner.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "Downloading runner from: $downloadUrl"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

if (-not (Test-Path $WorkDir)) { New-Item -ItemType Directory -Path $WorkDir | Out-Null }

Write-Host "Extracting runner to: $WorkDir"
Expand-Archive -Path $zipPath -DestinationPath $WorkDir -Force

Push-Location $WorkDir

Write-Host "Configuring runner for repository: $RepoOwner/$RepoName"
$cmdArgs = @('--unattended', '--url', $RepoUrl, '--token', $RunnerToken, '--labels', $RunnerLabels)
& .\config.cmd @cmdArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "config.cmd failed with exit code $LASTEXITCODE"
  Pop-Location
  exit $LASTEXITCODE
}

Write-Host "Installing the runner as Windows service..."
& .\svc install
if ($LASTEXITCODE -ne 0) { Write-Error "svc install failed ($LASTEXITCODE)"; Pop-Location; exit $LASTEXITCODE }

Write-Host "Starting the runner service..."
& .\svc start
if ($LASTEXITCODE -ne 0) { Write-Error "svc start failed ($LASTEXITCODE)"; Pop-Location; exit $LASTEXITCODE }

Pop-Location

# Cleanup zip
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host ""
Write-Host "Runner configured and service started. Vérifie GitHub → Settings → Actions → Runners pour voir le runner en ligne."
Write-Host "Le workflow doit utiliser 'runs-on: [self-hosted, sonar]' (déjà configuré dans .github/workflows/sonarqube-monorepo.yml)."
Write-Host ""
Write-Host "Exemples de commandes 'gh' pour ajouter les secrets Sonar à ton repo :"
Write-Host "  gh secret set SONAR_TOKEN --body '<SONAR_TOKEN>' --repo $RepoOwner/$RepoName"
Write-Host "  gh secret set SONAR_HOST_URL --body 'http://localhost:9000' --repo $RepoOwner/$RepoName"
Write-Host ""
Write-Host "Exécution example (remplace OWNER/REPO/RUNNER_TOKEN) :"
Write-Host "  PowerShell -ExecutionPolicy Bypass -File .\scripts\setup-self-hosted-runner.ps1 -RepoOwner OWNER -RepoName REPO -RunnerToken <RUNNER_TOKEN>"

Exit 0
