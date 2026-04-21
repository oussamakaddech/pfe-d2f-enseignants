$source = ".\esprit_D2F-authentification\src\main\java\esprit\pfe\auth\Security\AuthorizationMatrix.java"
$destinations = @(
    ".\esprit_D2F-formation\src\main\java\esprit\pfe\auth\Security",
    ".\esprit_D2F-besoin-formation\src\main\java\esprit\pfe\auth\Security",
    ".\esprit_D2F-competence\src\main\java\esprit\pfe\auth\Security",
    ".\esprit_D2F-analyse\src\main\java\esprit\pfe\auth\Security"
)
$services = @("formation", "besoin-formation", "competence", "analyse")

for ($i = 0; $i -lt $destinations.Length; $i++) {
    try {
        New-Item -ItemType Directory -Path $destinations[$i] -Force | Out-Null
        Copy-Item -Path $source -Destination "$($destinations[$i])\AuthorizationMatrix.java" -Force
        Write-Output "$($i+1). esprit_D2F-$($services[$i]) - Copied"
    }
    catch {
        Write-Output "$($i+1). esprit_D2F-$($services[$i]) - ERROR: $($_)"
    }
}
