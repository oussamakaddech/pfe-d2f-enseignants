Get-ChildItem -Path "esprit_D2F-webapp\src\services" -Filter *.js | Rename-Item -NewName { $_.Name -replace '\.js$','.ts' }
