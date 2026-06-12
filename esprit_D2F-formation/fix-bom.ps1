$filePath = 'C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation\src\main\java\esprit\pfe\serviceformation\services\EnseignantServiceImpl.java'
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Remove BOM if present (EF BB BF)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $newBytes = New-Object byte[] ($bytes.Length - 3)
    [Array]::Copy($bytes, 3, $newBytes, 0, $newBytes.Length)
    [System.IO.File]::WriteAllBytes($filePath, $newBytes)
    Write-Host "BOM removed"
} else {
    Write-Host "No BOM found"
}
