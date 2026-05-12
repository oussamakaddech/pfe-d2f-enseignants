
Set-Location "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-analyse/target/surefire-reports"
$files = Get-ChildItem -Filter "*.txt" | Select-Object -First 5
foreach ($f in $files) {
    Write-Host "=== $($f.Name) ==="
    Get-Content $f.FullName -Head 30
    Write-Host ""
}
