$filePath = 'C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation\src\main\java\esprit\pfe\serviceformation\services\EnseignantServiceImpl.java'
$lines = [System.IO.File]::ReadAllLines($filePath, [System.Text.Encoding]::UTF8)

# Find the line "    public Enseignant createEnseignant(Enseignant enseignant) {"
$methodStart = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'public Enseignant createEnseignant\(Enseignant enseignant\) \{') {
        $methodStart = $i
        break
    }
}

if ($methodStart -eq -1) {
    Write-Host "Method not found"
    exit 1
}

# Find the matching closing brace by counting braces
$braceCount = 0
$methodEnd = -1
for ($i = $methodStart; $i -lt $lines.Count; $i++) {
    $braceCount += ([regex]::Matches($lines[$i], '\{')).Count
    $braceCount -= ([regex]::Matches($lines[$i], '\}')).Count
    if ($braceCount -eq 0) {
        $methodEnd = $i
        break
    }
}

Write-Host "Method found at lines $($methodStart+1) to $($methodEnd+1)"

# Extract the method body (lines between opening and closing braces, exclusive)
$bodyLines = @()
for ($i = $methodStart + 1; $i -lt $methodEnd; $i++) {
    $bodyLines += $lines[$i]
}
$body = $bodyLines -join "`n"

# Build replacement
$newLines = @()
# Add lines before the method
for ($i = 0; $i -lt $methodStart; $i++) {
    $newLines += $lines[$i]
}

# Add the delegating public method
$newLines += '    @Override'
$newLines += '    @Transactional'
$newLines += '    public Enseignant createEnseignant(Enseignant enseignant) {'
$newLines += '        return doCreateEnseignant(enseignant);'
$newLines += '    }'
$newLines += ''
# Add the private implementation
$newLines += '    private Enseignant doCreateEnseignant(Enseignant enseignant) {'
foreach ($line in $bodyLines) {
    $newLines += $line
}

# Add lines after the method
for ($i = $methodEnd + 1; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
}

[System.IO.File]::WriteAllLines($filePath, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done - replaced createEnseignant with delegation + doCreateEnseignant"
