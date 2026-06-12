$filePath = 'C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation\src\main\java\esprit\pfe\serviceformation\services\EnseignantServiceImpl.java'
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Remove the duplicate @Override/@Transactional - replace the double pattern
$dup = "    @Override`r`n    @Transactional`r`n    @Override`r`n    @Transactional"
if ($content.Contains($dup)) {
    $content = $content.Replace($dup, "    @Override`r`n    @Transactional")
    Write-Host "Fixed duplicate annotations (CRLF)"
} else {
    $dup2 = "    @Override`n    @Transactional`n    @Override`n    @Transactional"
    if ($content.Contains($dup2)) {
        $content = $content.Replace($dup2, "    @Override`n    @Transactional")
        Write-Host "Fixed duplicate annotations (LF)"
    } else {
        Write-Host "Pattern not found"
    }
}

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done"
