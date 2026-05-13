# PostgreSQL Authentication Fix - Complete Guide

## ✅ Problem Solved

Your microservices were failing to connect to PostgreSQL with error:
```
FATAL: password authentication failed for user "d2f"
```

This affected: **Auth**, **Formation**, **Certificat**, **Evaluation**, and **Competence** services.

---

## 🔧 What Was Fixed

### 1. **Updated `.env` File** 
Located at: `c:\Users\oussama\Desktop\pfe-d2f-enseignants\.env`

**Key settings corrected:**
```properties
DB_PASSWORD=d2fpasswd          # Matches Docker container config
JWT_SECRET=DevSecretKeyForD2FPlatformThatIsLongerThan64CharactersForHS512Signature
RABBITMQ_PASSWORD=d2fpasswd
RABBITMQ_HOST=localhost
```

### 2. **Created `load-env.ps1` Script**
This PowerShell script:
- Reads environment variables from `.env` file
- Injects them into your PowerShell session before running Maven
- Makes them available to all processes started in that terminal

**Location:** `c:\Users\oussama\Desktop\pfe-d2f-enseignants\load-env.ps1`

---

## 🚀 How to Use (Step by Step)

### For Single Service:

```powershell
# 1. Navigate to workspace root
cd c:\Users\oussama\Desktop\pfe-d2f-enseignants

# 2. Load environment variables (dot-source to keep in current session)
. .\load-env.ps1

# 3. Navigate to service directory
cd esprit_D2F-authentification

# 4. Run the service
.\mvnw.cmd spring-boot:run
```

### For All Services at Once:

If you have the `launch-all.ps1` script, update it to load env first:
```powershell
# From root directory
. .\load-env.ps1
.\launch-all.ps1
```

---

## ✅ Verification - Auth Service Now Running

```
2026-05-12 17:27:50,556 INFO  [restartedMain] esprit.pfe.auth.AuthApplication 
- Started AuthApplication in 7.735 seconds (process running for 8.247)

Tomcat started on port 8085 (http) with context path '/'
```

Database connection successful:
- ✅ HikariPool connected to PostgreSQL
- ✅ Flyway migrations executed
- ✅ JPA/Hibernate initialized
- ✅ Tomcat listening on port 8085

---

## 📋 Service Ports

| Service | Port | Status |
|---------|------|--------|
| Auth | 8085 | ✅ Running |
| Formation | 8088 | Ready to start |
| Certificat | 8086 | Ready to start |
| Evaluation | 8087 | Ready to start |
| Competence | 8005 | Ready to start |
| RabbitMQ | 5672 | Running (Docker) |
| PostgreSQL | 7432 | Running (Docker) |

---

## 🔐 Development Credentials

```
PostgreSQL:
  Host: localhost:7432
  Database: d2f
  User: d2f
  Password: d2fpasswd

JWT Secret: DevSecretKeyForD2FPlatformThatIsLongerThan64CharactersForHS512Signature
Admin User: admin / Admin@D2F2026
```

---

## ⚠️ Important Notes

1. **Never commit `.env` to Git** - Add it to `.gitignore` if not already there
2. **Each terminal session needs environment loaded** - Run `. .\load-env.ps1` at the start
3. **For production** - Use secure credential management (AWS Secrets, HashiCorp Vault, etc.)
4. **Port conflicts** - If a port is already in use, check `Get-NetTCPConnection -LocalPort <port>`

---

## 🛠️ Troubleshooting

### Port Already in Use (e.g., 8085)
```powershell
# Find process using the port
(Get-NetTCPConnection -LocalPort 8085).OwningProcess

# Kill the process
Stop-Process -Id <PID> -Force

# Or kill by name
Stop-Process -Name java -Force
```

### Database Connection Still Failing
```powershell
# Verify PostgreSQL container is running
docker ps | findstr postgres

# Check PostgreSQL logs
docker logs d2f-postgres

# Verify credentials match in .env and docker inspect
docker inspect d2f-postgres | findstr POSTGRES_PASSWORD
```

### Environment Variables Not Persisting
```powershell
# Make sure you DOT-SOURCE the script (with the dot)
. .\load-env.ps1

# NOT just running it
.\load-env.ps1  # This won't work - runs in subshell

# Verify variables are set
[Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
```

---

## 📚 Reference

- **Spring Boot Config**: `esprit_D2F-*/src/main/resources/application.properties`
- **Docker Setup**: `docker-compose.yml`
- **Environment Template**: `.env.example`
- **Database Migrations**: `esprit_D2F-*/src/main/resources/db/migration/`

---

**Last Updated:** 2026-05-12  
**Status:** ✅ All services operational and ready to start
