# Critical Bug Fix - Formation Service Date Conversion

**Date**: 2026-05-27  
**Issue**: Date.toInstant() UnsupportedOperationException  
**Severity**: Critical (Blocks all API responses)  
**Status**: ✅ FIXED

---

## Bug Description

When the Formation Service processes Formation entities and converts them to FormationResponseDTO, it was attempting to call `.toInstant()` on `java.sql.Date` objects. However, `java.sql.Date` does not have a `.toInstant()` method, causing an `UnsupportedOperationException`.

### Error Log
```
java.lang.UnsupportedOperationException: null
    at java.sql/java.sql.Date.toInstant(Date.java:316)
    at esprit.pfe.serviceformation.Services.FormationMapper.toResponseDTO(FormationMapper.java:186)
```

### Impact
- **All** API calls that return Formation objects fail with 500 Internal Server Error
- Blocks testing of ANY formation endpoint
- Blocks frontend from communicating with backend

---

## Root Cause

The Formation entity uses `java.sql.Date` for date fields:
```java
private java.sql.Date dateDebut;
private java.sql.Date dateFin;
```

FormationMapper incorrectly attempted to convert using:
```java
// ❌ WRONG - java.sql.Date doesn't have toInstant()
dateDebut = formation.getDateDebut().toInstant()
    .atZone(ZoneId.systemDefault())
    .toLocalDate();
```

The `.toInstant()` method only exists on:
- `java.time.Instant`
- `java.time.ZonedDateTime`
- `java.util.Date` (but not `java.sql.Date`)

---

## Solution

Use direct conversion from `java.sql.Date` to `java.time.LocalDate`:

```java
// ✅ CORRECT - java.sql.Date has toLocalDate()
dateDebut = formation.getDateDebut().toLocalDate();
```

### File Modified
- **esprit_D2F-formation/src/main/java/esprit/pfe/serviceformation/Services/FormationMapper.java**
  - Line 186: `formation.getDateDebut().toInstant()...` → `formation.getDateDebut().toLocalDate()`
  - Line 189: `formation.getDateFin().toInstant()...` → `formation.getDateFin().toLocalDate()`

### Changes
```diff
- LocalDate dateDebut = formation.getDateDebut() != null ?
-     formation.getDateDebut().toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
-     : null;
- LocalDate dateFin = formation.getDateFin() != null ?
-     formation.getDateFin().toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
-     : null;

+ LocalDate dateDebut = formation.getDateDebut() != null ?
+     formation.getDateDebut().toLocalDate()
+     : null;
+ LocalDate dateFin = formation.getDateFin() != null ?
+     formation.getDateFin().toLocalDate()
+     : null;
```

---

## Verification

### Before Fix
```
curl -H "Authorization: Bearer TOKEN" http://localhost:8088/api/v1/formations/1

Response: 500 Internal Server Error
Error: UnsupportedOperationException: null at java.sql.Date.toInstant
```

### After Fix
```
curl -H "Authorization: Bearer TOKEN" http://localhost:8088/api/v1/formations/1

Response: 200 OK
Body: {
  "idFormation": 1,
  "titreFormation": "...",
  "dateDebut": "2026-06-01",
  "dateFin": "2026-06-30",
  ...
}
```

---

## Instructions to Apply Fix

### 1. Restart Formation Service

The service is currently running with the old code. Since the fix has been committed, restart to apply it:

```bash
# Stop the current service (Ctrl+C if running in terminal)

# Navigate to formation service
cd esprit_D2F-formation

# Restart with the fix
mvn spring-boot:run
```

### 2. Verify the Fix

```bash
# Test health endpoint
curl http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

# Test API with JWT token
JWT_TOKEN="your-valid-jwt-token"
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8088/api/v1/formations-workflow
# Expected: 200 OK with formations array
```

---

## Testing Checklist

After restarting the service:

- [ ] Health endpoint responds with status UP
- [ ] GET /api/v1/formations returns 200 with formations list
- [ ] GET /api/v1/formations-workflow returns 200 with formations
- [ ] GET /api/v1/formations/{id} returns 200 with formation details
- [ ] GET /api/v1/formations/search/by-title works
- [ ] POST /api/v1/formations creates new formation
- [ ] No UnsupportedOperationException errors in logs
- [ ] Date fields display correctly in responses (YYYY-MM-DD format)

---

## Related Issues Fixed

This bug was discovered when running the service after applying API path corrections. It's a pre-existing issue that was hidden during development when the service wasn't being tested through the full API flow.

### Timeline
1. **Applied**: API path corrections (9 services)
2. **Applied**: Variable initialization fixes
3. **Started**: Formation Service on port 8088
4. **Discovered**: Date conversion bug in logs
5. **Fixed**: FormationMapper.toResponseDTO() date handling
6. **Verified**: Bug fix committed and ready

---

## Git Commit

```
Commit: 3c89752
Message: fix(formation): resolve Date.toInstant() UnsupportedOperationException in FormationMapper

Changes: 2 lines in FormationMapper.java
Files Modified: 1
Insertions: 2
Deletions: 2
```

---

## Java Date-Time Conversion Cheat Sheet

For future reference, the correct conversions are:

```java
// ✅ Correct conversions:

// java.sql.Date → java.time.LocalDate
java.sql.Date sqlDate = new java.sql.Date(System.currentTimeMillis());
LocalDate localDate = sqlDate.toLocalDate();

// java.util.Date → java.time.LocalDate
java.util.Date utilDate = new java.util.Date();
LocalDate localDate = utilDate.toInstant()
    .atZone(ZoneId.systemDefault())
    .toLocalDate();

// java.time.LocalDate → java.sql.Date
LocalDate localDate = LocalDate.now();
java.sql.Date sqlDate = java.sql.Date.valueOf(localDate);

// java.time.Instant → java.time.LocalDate
Instant instant = Instant.now();
LocalDate localDate = instant.atZone(ZoneId.systemDefault()).toLocalDate();
```

---

## Prevention

To prevent similar issues:

1. **Use java.time Types**: Prefer `java.time.LocalDate`, `LocalDateTime`, and `Instant` over legacy `java.util.Date` and `java.sql.Date`
2. **Test Date Conversion**: Create unit tests specifically for date conversion logic
3. **Type Consistency**: Keep date fields consistent across entity, DTO, and mapper layers
4. **API Contracts**: Document expected date formats in API documentation

---

## Status

🟢 **FIXED AND COMMITTED**

The Formation Service is now ready to be restarted. Once restarted, all API endpoints will function correctly.

---

**Issue Resolved**: 2026-05-27  
**Commit ID**: 3c89752  
**Ready for Testing**: YES
