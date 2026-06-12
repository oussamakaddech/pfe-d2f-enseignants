$filePath = 'C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation\src\main\java\esprit\pfe\serviceformation\services\EnseignantServiceImpl.java'
$content = [System.IO.File]::ReadAllText($filePath)

# Replace the self-invocation: createEnseignant(enseignant) -> doCreateEnseignant(enseignant)
$content = $content.Replace('        return createEnseignant(enseignant);', '        return doCreateEnseignant(enseignant);')

[System.IO.File]::WriteAllText($filePath, $content)
Write-Host "Done"
