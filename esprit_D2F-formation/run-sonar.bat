@echo off
cd /d "C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation"
rd /s /q target 2>nul
call mvn verify sonar:sonar -Dsonar.token=squ_a43e4c24905c32ea1c033976adab5e33a9fd9fb9 -Dsonar.host.url=http://localhost:9000
