$token = "sqa_24b89d888de71d49837a3c2d36b3265f43503d83"
$srcDir = "C:\Users\oussama\Desktop\pfe-d2f-enseignants"

# Create shared Maven repo volume (persists d2f-common-security across containers)
docker volume create maven-repo 2>&1 | Out-Null

# Step 1: Install d2f-common-security into the shared Maven repo
Write-Host ">>> [0/10] Installing d2f-common-security..." -ForegroundColor Cyan
docker run --rm --network d2f-network -v "${srcDir}:/src" -v "maven-repo:/root/.m2" -w /src/esprit_D2F-common-security maven:3.9-eclipse-temurin-17 mvn clean install -DskipTests 2>&1 | Out-String | ForEach-Object { $_.Replace("`0","") } | Select-String -Pattern "BUILD|ERROR" | ForEach-Object { $_.Line }

# Step 2: Analyze each service
$services = @(
    @{ key = "auth-service"; dir = "esprit_D2F-authentification" },
    @{ key = "analyse-service"; dir = "esprit_D2F-analyse" },
    @{ key = "competence-service"; dir = "esprit_D2F-competence" },
    @{ key = "besoin-formation-service"; dir = "esprit_D2F-besoin-formation" },
    @{ key = "certificat-service"; dir = "esprit_D2F-certificat" },
    @{ key = "evaluation-service"; dir = "esprit_D2F-evaluation" },
    @{ key = "formation-service"; dir = "esprit_D2F-formation" },
    @{ key = "notification-service"; dir = "esprit_D2F-notification" },
    @{ key = "api-gateway"; dir = "esprit_D2F-api-gateway" },
    @{ key = "common-security"; dir = "esprit_D2F-common-security" }
)

$i = 1
foreach ($svc in $services) {
    $projectKey = "pfe-d2f-" + $svc.key
    $workDir = "/src/$($svc.dir)"
    Write-Host "`n>>> [$i/10] Analyzing $projectKey (dir: $($svc.dir))..." -ForegroundColor Cyan

    docker run --rm --network d2f-network `
        -v "${srcDir}:/src" `
        -v "maven-repo:/root/.m2" `
        -e "SONAR_TOKEN=$token" `
        -w $workDir `
        maven:3.9-eclipse-temurin-17 `
        mvn org.sonarsource.scanner.maven:sonar-maven-plugin:5.1.0.4751:sonar "-Dsonar.host.url=http://sonarqube:9000" "-Dsonar.token=$token" "-Dsonar.qualitygate.wait=true" 2>&1 | Out-String | ForEach-Object { $_.Replace("`0","") } | Select-String -Pattern "BUILD|ERROR|sonar" | ForEach-Object { $_.Line }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [$projectKey] SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "  [$projectKey] FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
    $i++
}

Write-Host "`n>>> All 10 services analyzed. Visit http://localhost:9000"
