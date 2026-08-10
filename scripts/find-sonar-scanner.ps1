$p = Join-Path $env:USERPROFILE '.sonar\native-sonar-scanner'
$found = Get-ChildItem $p -Recurse -Filter 'sonar-scanner.bat' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if ($found) {
    Write-Host $found
} else {
    Write-Host "NOT_FOUND"
    exit 1
}