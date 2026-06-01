# Load environment variables from .env file into current session
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile..." -ForegroundColor Green
    Get-Content $envFile | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value) {
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
                if ($key -like "*PASSWORD*" -or $key -like "*SECRET*") {
                    Write-Host "  [OK] $key (***)" -ForegroundColor Cyan
                } else {
                    Write-Host "  [OK] $key" -ForegroundColor Cyan
                }
            }
        }
    }
    Write-Host "Done! Environment variables loaded." -ForegroundColor Green
} else {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    exit 1
}
