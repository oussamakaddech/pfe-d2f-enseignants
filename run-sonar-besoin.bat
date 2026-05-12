@echo off
cd /d c:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-besoin-formation
echo [1/2] Execution des tests et generation du rapport JaCoCo...
call mvnw.cmd clean test jacoco:report
echo [2/2] Envoi vers SonarQube...
call mvnw.cmd sonar:sonar "-Dsonar.projectKey=besoinsformation-service" "-Dsonar.host.url=http://localhost:9000" "-Dsonar.login=admin" "-Dsonar.password=0710oussamA@" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
echo Analyse terminee !
pause
