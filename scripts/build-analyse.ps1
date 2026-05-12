
# Build and test service-analyse with JaCoCo coverage
$ErrorActionPreference = "Continue"
Set-Location "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-analyse"
$env:JWT_SECRET = "9a674753-4567-4567-4567-456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567456745674567"
& ".\mvnw.cmd" clean test jacoco:report 2>&1 | Write-Host
Write-Host "EXIT CODE: $LASTEXITCODE"
if (Test-Path "target/site/jacoco/jacoco.xml") {
    Write-Host "JaCoCo report generated successfully"
} else {
    Write-Host "JaCoCo report NOT found"
}
