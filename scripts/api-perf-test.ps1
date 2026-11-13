<#
.SYNOPSIS
    Test de performance API DSI — verifie l'exigence "temps de reponse < 200 ms"
    (Cahier des charges technique DSI 2025-2026, Partie I §2 Performance).

.DESCRIPTION
    Sonde de latence sans dependance externe : envoie N requetes par endpoint,
    calcule moyenne / p50 / p95 / max, et echoue (exit code 1) si le p95 depasse
    le seuil. Utilisable localement et dans le CI (runner Windows self-hosted).

.PARAMETER Targets
    Liste d'endpoints a sonder, format "Nom|URL[|Bearer TOKEN]".

.PARAMETER Requests
    Nombre de requetes mesurees par endpoint (defaut 20).

.PARAMETER Warmup
    Requetes d'echauffement non comptees (defaut 2).

.PARAMETER ThresholdMs
    Seuil p95 en millisecondes (defaut 200 — exigence DSI).

.PARAMETER JsonOut
    Chemin optionnel d'un rapport JSON (pour archivage CI).

.EXAMPLE
    .\api-perf-test.ps1 -Targets @("health|http://localhost:8009/actuator/health") -Requests 30

.EXAMPLE
    .\api-perf-test.ps1 -Targets @("notifs|http://localhost:8009/api/v1/notifications/count|eyJhbGci...") 
#>
param(
    [Parameter(Mandatory = $true)][string[]]$Targets,
    [int]$Requests = 20,
    [int]$Warmup = 2,
    [int]$ThresholdMs = 200,
    [string]$JsonOut = ""
)

$ErrorActionPreference = 'Stop'
$results = @()
$failed = $false

Write-Host ""
Write-Host "=== Test performance API — seuil p95 < ${ThresholdMs} ms ===" -ForegroundColor Cyan

foreach ($target in $Targets) {
    $parts = $target -split '\|'
    if ($parts.Count -lt 2) { throw "Target invalide (attendu Nom|URL[|TOKEN]) : $target" }
    $name = $parts[0].Trim()
    $url  = $parts[1].Trim()
    $token = if ($parts.Count -ge 3) { $parts[2].Trim() } else { "" }

    $headers = @{ Accept = 'application/json' }
    if ($token) { $headers['Authorization'] = "Bearer $token" }

    # Echauffement (JIT/connexions pool) — non mesure
    for ($i = 0; $i -lt $Warmup; $i++) {
        try { Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 15 | Out-Null } catch {
            if ($_.Exception.Response -eq $null) { throw "Endpoint injoignable ($name) : $url" }
        }
    }

    $latencies = New-Object System.Collections.Generic.List[double]
    $errors = 0
    for ($i = 0; $i -lt $Requests; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 15 | Out-Null
        } catch {
            # Un code HTTP 4xx/5xx est une reponse valide pour la latence ; seule
            # l'injoignabilite reelle compte comme erreur.
            if ($_.Exception.Response -eq $null) { $errors++ }
        }
        $sw.Stop()
        $latencies.Add($sw.Elapsed.TotalMilliseconds)
    }

    $sorted = $latencies | Sort-Object
    $p95Index = [Math]::Min([Math]::Ceiling(0.95 * $sorted.Count) - 1, $sorted.Count - 1)
    $p95 = [Math]::Round($sorted[$p95Index], 1)
    $avg = [Math]::Round(($latencies | Measure-Object -Average).Average, 1)
    $max = [Math]::Round($sorted[-1], 1)
    $ok  = ($p95 -lt $ThresholdMs) -and ($errors -eq 0)
    if (-not $ok) { $failed = $true }

    $color = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ("{0,-22} n={1}  avg={2} ms  p50={3} ms  p95={4} ms  max={5} ms  erreurs={6}  -> {7}" -f `
        $name, $Requests, $avg, [Math]::Round($sorted[[int](($sorted.Count-1)/2)], 1), $p95, $max, $errors, $(if ($ok) {'OK'} else {'DEPASSE'})) -ForegroundColor $color

    $results += [ordered]@{
        endpoint = $name; url = $url; requests = $Requests; errors = $errors
        avg_ms = $avg; p50_ms = [Math]::Round($sorted[[int](($sorted.Count-1)/2)], 1)
        p95_ms = $p95; max_ms = $max; threshold_p95_ms = $ThresholdMs; pass = $ok
    }
}

if ($JsonOut) {
    $results | ConvertTo-Json -Depth 4 | Set-Content -Path $JsonOut -Encoding UTF8
    Write-Host "Rapport JSON : $JsonOut"
}

Write-Host ""
if ($failed) {
    Write-Host "ECHEC : au moins un endpoint depasse p95 ${ThresholdMs} ms (exigence DSI)." -ForegroundColor Red
    exit 1
}
Write-Host "SUCCES : tous les endpoints respectent p95 < ${ThresholdMs} ms." -ForegroundColor Green
exit 0
