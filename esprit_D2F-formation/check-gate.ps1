$token = 'squ_a43e4c24905c32ea1c033976adab5e33a9fd9fb9'
$cred = [System.Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${token}:"))
$headers = @{ Authorization = "Basic $cred" }
$response = Invoke-RestMethod -Uri 'http://localhost:9000/api/qualitygates/project_status?projectKey=d2f_formation' -Headers $headers
$response | ConvertTo-Json -Depth 10
