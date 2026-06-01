# =============================================================================
# generate-jwt-secret.ps1 - Génération d'un JWT_SECRET sécurisé
# =============================================================================
# Usage :
#   .\scripts\generate-jwt-secret.ps1
#
# Ce script génère un JWT_SECRET sécurisé de 64 caractères minimum
# et met à jour le fichier .env avec ce secret.
# =============================================================================

# Vérifier si OpenSSL est disponible
$opensslAvailable = Get-Command openssl -ErrorAction SilentlyContinue

if ($opensslAvailable) {
    Write-Host "OpenSSL détecté, génération du secret avec OpenSSL..." -ForegroundColor Green
    # Générer un secret sécurisé de 64 caractères en base64
    $secret = openssl rand -base64 64 | Out-String
    $secret = $secret.Trim()
} else {
    Write-Host "OpenSSL non détecté, génération du secret avec .NET..." -ForegroundColor Yellow
    # Utiliser .NET pour générer un secret sécurisé
    $bytes = New-Object byte[] 64
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)
    $secret = [System.Convert]::ToBase64String($bytes)
}

# Afficher le secret généré
Write-Host "`nJWT_SECRET généré :" -ForegroundColor Cyan
Write-Host $secret -ForegroundColor White
Write-Host "`nLongueur : $($secret.Length) caractères" -ForegroundColor Gray

# Vérifier si le fichier .env existe
$envFile = ".env"
$envExampleFile = ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExampleFile) {
        Write-Host "`nCréation du fichier .env à partir de .env.example..." -ForegroundColor Green
        Copy-Item $envExampleFile $envFile
    } else {
        Write-Host "`nCréation d'un nouveau fichier .env..." -ForegroundColor Green
        New-Item -Path $envFile -ItemType File | Out-Null
    }
}

# Mettre à jour le fichier .env avec le JWT_SECRET
$envContent = Get-Content $envFile -Raw
if ($envContent -match 'JWT_SECRET=') {
    $envContent = $envContent -replace 'JWT_SECRET=.*', "JWT_SECRET=$secret"
    Set-Content -Path $envFile -Value $envContent -NoNewline
    Write-Host "`nJWT_SECRET mis à jour dans le fichier .env" -ForegroundColor Green
} else {
    Add-Content -Path $envFile -Value "`nJWT_SECRET=$secret"
    Write-Host "`nJWT_SECRET ajouté au fichier .env" -ForegroundColor Green
}

Write-Host "`n✅ Opération terminée avec succès !" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANT : Ne jamais committer le fichier .env dans Git !" -ForegroundColor Red
