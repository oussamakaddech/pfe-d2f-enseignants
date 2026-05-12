
$ErrorActionPreference = "Continue"
Set-Location "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-analyse"
$env:JWT_SECRET = "9a674753-4567-4567-4567-456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567"
& ".\mvnw.cmd" clean test jacoco:report -DskipTests=false 2>&1 | Select-Object -Last 30 | Write-Host
Write-Host ""
Write-Host "EXIT CODE: $LASTEXITCODE"
if (Test-Path "target/site/jacoco/jacoco.xml") {
    Write-Host "SUCCESS: JaCoCo report generated"
    $f = Get-Item "target/site/jacoco/jacoco.xml"
    Write-Host "Size: $($f.Length) bytes, Modified: $($f.LastWriteTime)"
} else {
    Write-Host "ERROR: JaCoCo report NOT found"
    if (Test-Path "target/surefire-reports") {
        Write-Host "Surefire reports exist"
    }
}
