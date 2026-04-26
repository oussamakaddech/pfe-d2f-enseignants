$dirs = @(
    "esprit_D2F-formation\src\main\java",
    "esprit_D2F-evaluation\src\main\java",
    "esprit_D2F-certificat\src\main\java",
    "esprit_D2F-besoin-formation\src\main\java",
    "esprit_D2F-authentification\src\main\java"
)

foreach ($d in $dirs) {
    Get-ChildItem -Path $d -Recurse -Filter *.java | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $newContent = [regex]::Replace($content, '@RequestMapping\(\"/(?!api/v1/)(.*?)\"\)', '@RequestMapping("/api/v1/$1")')
        
        $newContent = $newContent.Replace('@RequestMapping("/api/v1/user/auth")', '@RequestMapping("/api/v1/auth")')
        $newContent = $newContent.Replace('@RequestMapping("/api/v1/user/account")', '@RequestMapping("/api/v1/account")')
        
        if ($content -ne $newContent) {
            Set-Content -Path $_.FullName -Value $newContent
            Write-Host "Updated $($_.FullName)"
        }
    }
}
