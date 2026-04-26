$ErrorActionPreference = "Continue"

$javaModules = @(
    "esprit_D2F-authentification",
    "esprit_D2F-besoin-formation",
    "esprit_D2F-certificat",
    "esprit_D2F-competence",
    "esprit_D2F-evaluation",
    "esprit_D2F-formation",
    "esprit_D2F-api-gateway"
)

$pythonModules = @(
    "esprit_D2F-predictive-analytics",
    "esprit_D2F-rice"
)

$frontendModule = "esprit_D2F-webapp"

$report = @()

Write-Host "========================================="
Write-Host "   RUNNING TESTS ACROSS ALL MODULES"
Write-Host "========================================="

# 1. Java Modules
foreach ($mod in $javaModules) {
    Write-Host "`n---> Running Maven tests in $mod"
    Push-Location $mod
    
    # Run tests
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c mvnw.cmd test" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        $status = "PASS"
        Write-Host "✅ $mod tests passed!" -ForegroundColor Green
    } else {
        $status = "FAIL"
        Write-Host "❌ $mod tests failed!" -ForegroundColor Red
    }
    
    $report += [PSCustomObject]@{ Module = $mod; Type = "Java/Maven"; Status = $status }
    Pop-Location
}

# 2. Frontend
Write-Host "`n---> Running Frontend tests in $frontendModule"
Push-Location $frontendModule
# Ensure dependencies are installed before running tests
if (-not (Test-Path "node_modules")) {
    Write-Host "Running npm install..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -NoNewWindow -Wait
}
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run test" -NoNewWindow -Wait -PassThru
if ($process.ExitCode -eq 0) {
    $status = "PASS"
    Write-Host "✅ $frontendModule tests passed!" -ForegroundColor Green
} else {
    $status = "FAIL"
    Write-Host "❌ $frontendModule tests failed!" -ForegroundColor Red
}
$report += [PSCustomObject]@{ Module = $frontendModule; Type = "React/Vitest"; Status = $status }
Pop-Location

# 3. Python Modules
foreach ($mod in $pythonModules) {
    Write-Host "`n---> Running Pytest in $mod"
    Push-Location $mod
    
    # Check if pytest is available via py or python
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c python -m pytest" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        $status = "PASS"
        Write-Host "✅ $mod tests passed!" -ForegroundColor Green
    } else {
        $status = "FAIL"
        Write-Host "❌ $mod tests failed!" -ForegroundColor Red
    }
    
    $report += [PSCustomObject]@{ Module = $mod; Type = "Python/Pytest"; Status = $status }
    Pop-Location
}

Write-Host "`n========================================="
Write-Host "           TEST SUMMARY"
Write-Host "========================================="
$report | Format-Table -AutoSize
