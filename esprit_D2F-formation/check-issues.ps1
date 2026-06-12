$token = 'squ_a43e4c24905c32ea1c033976adab5e33a9fd9fb9'
$cred = [System.Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${token}:"))
$headers = @{ Authorization = "Basic $cred" }
$response = Invoke-RestMethod -Uri 'http://localhost:9000/api/issues/search?componentKeys=d2f_formation&statuses=OPEN&types=CODE_SMELL&ps=100&resolved=false' -Headers $headers
$response.issues | ForEach-Object { "$($_.component):$($_.line) - $($_.message)" } | Select-Object -First 50
