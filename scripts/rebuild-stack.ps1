# ============================================================
# Reconstruction fiable de la pile Docker - PFE D2F Enseignants
# ============================================================
# Usage :
#   .\scripts\rebuild-stack.ps1                         # tous les services construits
#   .\scripts\rebuild-stack.ps1 -Services api-gateway,webapp
#   .\scripts\rebuild-stack.ps1 -NoBuild                # seulement vérifier / réparer
#
# Pourquoi ce script plutôt que « docker compose build ; docker compose up -d » :
#
# 1. Conteneurs restés sur une ancienne image. Constaté le 2026-09-24 : après un
#    build réussi, « up -d » a répondu « Running » pour 11 conteneurs qui
#    tournaient sur des images supprimées depuis. Le script compare, pour chaque
#    conteneur, l'image exécutée à l'image actuellement taguée, et recrée
#    (--force-recreate --no-deps) ceux qui sont en retard.
#
# 2. File RabbitMQ déclarée avec d'autres arguments. Le broker conserve ses
#    files dans un volume persistant et les arguments d'une file (TTL,
#    dead-letter...) sont IMMUABLES : un service qui les modifie échoue au
#    démarrage (PRECONDITION_FAILED « inequivalent arg »). Selon la durée de
#    l'indicateur de santé Rabbit, le conteneur passe « unhealthy » (et bloque
#    les services qui dépendent de lui) ou reste « healthy » en réessayant sans
#    fin : la santé ne suffit donc pas. Le script cherche l'erreur dans les
#    journaux de CHAQUE conteneur construit depuis son dernier démarrage, la supprime SEULEMENT SI ELLE EST VIDE
#    (rabbitmqctl --if-empty : aucun message perdu) puis redémarre le service,
#    qui la recrée avec ses nouveaux arguments. Une file non vide n'est jamais
#    touchée : le script s'arrête et indique quoi faire.
#
# Code de sortie : 0 si tous les conteneurs sont sains et à jour, 1 sinon.
# ============================================================
[CmdletBinding()]
param(
    [string[]]$Services = @(),
    [switch]$NoBuild,
    [int]$HealthTimeoutSec = 600
)

# 'Continue' et non 'Stop' : sous PowerShell 5.1, rediriger le stderr d'un
# exécutable (docker logs 2>&1) lève une exception en mode 'Stop'. Les codes
# de retour de docker sont contrôlés explicitement ($LASTEXITCODE).
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Write-Step([string]$message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Get-ComposeServices {
    $json = (& docker compose config --format json) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "docker compose config a échoué" }
    return ($json | ConvertFrom-Json).services
}

function Get-ServiceContainers([string]$service) {
    $ids = & docker compose ps -a -q $service
    return @($ids | Where-Object { $_ })
}

function Get-ContainerState([string]$id) {
    $raw = & docker inspect -f '{{.Name}}|{{.State.Status}}|{{.State.ExitCode}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}|{{.Image}}|{{.Config.Image}}|{{.State.StartedAt}}' $id
    $p = $raw.Split('|')
    $tagged = & docker image inspect -f '{{.Id}}' $p[5] 2>$null
    if ($LASTEXITCODE -ne 0) { $tagged = $null }
    return [pscustomobject]@{
        Id       = $id
        Name     = $p[0].TrimStart('/')
        Status   = $p[1]
        ExitCode = [int]$p[2]
        Health   = $p[3]
        UpToDate = ($null -eq $tagged) -or ($p[4] -eq $tagged)
        Started  = $p[6]
    }
}

# Sain = en marche et « healthy » (ou sans healthcheck), ou tâche ponctuelle terminée en 0.
function Test-Healthy($s) {
    if ($s.Status -eq 'exited') { return $s.ExitCode -eq 0 }
    return ($s.Status -eq 'running') -and ($s.Health -eq '' -or $s.Health -eq 'healthy')
}

function Get-StackStates([string[]]$serviceNames) {
    $states = @()
    foreach ($svc in $serviceNames) {
        foreach ($id in Get-ServiceContainers $svc) {
            $st = Get-ContainerState $id
            $st | Add-Member -NotePropertyName Service -NotePropertyValue $svc
            $states += $st
        }
    }
    return $states
}

function Wait-Settled([string[]]$serviceNames) {
    $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
    while ($true) {
        $states = Get-StackStates $serviceNames
        # « created » n'est pas attendu : c'est un conteneur bloqué par une
        # dépendance en échec, il est traité comme un échec puis relancé.
        $pending = @($states | Where-Object {
            $_.Health -eq 'starting' -or $_.Status -eq 'restarting'
        })
        if ($pending.Count -eq 0 -or (Get-Date) -gt $deadline) { return $states }
        Start-Sleep -Seconds 5
    }
}

function Repair-OutdatedContainers([string[]]$builtServices) {
    $outdated = @(Get-StackStates $builtServices |
        Where-Object { -not $_.UpToDate } | Select-Object -ExpandProperty Service -Unique)
    if ($outdated.Count -eq 0) {
        Write-Host "Tous les conteneurs exécutent leur image actuelle."
        return
    }
    Write-Host "Conteneurs sur une ancienne image : $($outdated -join ', ') -> recréation" -ForegroundColor Yellow
    & docker compose up -d --force-recreate --no-deps @outdated
}

# Renvoie $true si au moins une file a été réparée (le service a été redémarré).
# Journaux lus depuis le DERNIER démarrage du conteneur : une erreur réparée
# puis suivie d'un redémarrage n'est pas redétectée.
function Repair-QueueArguments($states, [string]$rabbitContainer) {
    $repaired = $false
    foreach ($s in @($states | Where-Object { $_.Status -eq 'running' })) {
        $restart = $false
        # cmd /c : fusion stdout/stderr sans que PowerShell 5.1 ne convertisse
        # chaque ligne de stderr en ErrorRecord.
        $logs = (& cmd /c "docker logs --since $($s.Started) $($s.Id) 2>&1" | Out-String)
        $found = [regex]::Matches($logs, "inequivalent arg '([^']+)' for queue '([^']+)'")
        $queues = @($found | ForEach-Object { $_.Groups[2].Value } | Select-Object -Unique)
        foreach ($queue in $queues) {
            Write-Host "$($s.Name) : file '$queue' déclarée avec d'autres arguments sur le broker." -ForegroundColor Yellow
            & docker exec $rabbitContainer rabbitmqctl delete_queue $queue --if-empty
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  File NON VIDE : non supprimée (aucun message n'est jamais jeté)." -ForegroundColor Red
                Write-Host "  Vider ou transférer ses messages (UI http://localhost:15672), puis relancer ce script." -ForegroundColor Red
                continue
            }
            Write-Host "  File vide supprimée ; le service la recrée avec ses nouveaux arguments." -ForegroundColor Green
            $restart = $true
        }
        if ($restart) {
            & docker restart $s.Id | Out-Null
            $repaired = $true
        }
    }
    return $repaired
}

# ------------------------------------------------------------ Exécution
# Via « powershell -File », « -Services a,b » arrive en UNE chaîne « a,b » :
# on découpe sur les virgules (sans effet quand la liste est déjà un tableau).
$Services = @($Services | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$compose = Get-ComposeServices
$allServices = @($compose.PSObject.Properties.Name)
$builtServices = @($allServices | Where-Object { $compose.$_.build })
if ($Services.Count -gt 0) {
    $unknown = @($Services | Where-Object { $_ -notin $allServices })
    if ($unknown.Count -gt 0) { throw "Services inconnus : $($unknown -join ', ')" }
    $builtServices = @($builtServices | Where-Object { $_ -in $Services })
}
$targets = if ($Services.Count -gt 0) { $Services } else { $allServices }

if (-not $NoBuild -and $builtServices.Count -gt 0) {
    Write-Step "Build : $($builtServices -join ', ')"
    & docker compose build @builtServices
    if ($LASTEXITCODE -ne 0) { throw "docker compose build a échoué" }
}

$rabbit = (Get-ServiceContainers 'rabbitmq' | Select-Object -First 1)

for ($round = 1; $round -le 3; $round++) {
    Write-Step "Démarrage (passe $round)"
    # Un échec ici est attendu si un service est bloqué : il est traité juste après.
    & docker compose up -d @targets

    Write-Step "Contrôle des images exécutées"
    Repair-OutdatedContainers $builtServices

    Write-Step "Attente de l'état stable (max $HealthTimeoutSec s)"
    $states = Wait-Settled $targets

    Write-Step "Contrôle des files RabbitMQ déclarées par les services"
    $built = @($states | Where-Object { $_.Service -in $builtServices })
    $repaired = [bool]$rabbit -and (Repair-QueueArguments $built $rabbit)
    if (-not $repaired) { Write-Host "Aucune file en conflit d'arguments." }

    $bad = @($states | Where-Object { -not (Test-Healthy $_) })
    if ($repaired) { continue }  # services redémarrés : nouvelle passe
    if ($bad.Count -eq 0) { break }
    Write-Host "Conteneurs en échec : $(($bad | ForEach-Object { $_.Name }) -join ', ')" -ForegroundColor Yellow
    break
}

Write-Step "Bilan"
$final = Wait-Settled $targets
$final | Sort-Object Name | Format-Table Name, Status, Health,
    @{ Label = 'Image'; Expression = { if ($_.UpToDate) { 'à jour' } else { 'ANCIENNE' } } } -AutoSize
$ko = @($final | Where-Object { -not (Test-Healthy $_) -or -not $_.UpToDate })
if ($ko.Count -gt 0) {
    Write-Host "ÉCHEC : $(($ko | ForEach-Object { $_.Name }) -join ', ') (voir docker logs <conteneur>)" -ForegroundColor Red
    exit 1
}
Write-Host "Pile saine : tous les conteneurs sont à jour et en bonne santé." -ForegroundColor Green
exit 0
