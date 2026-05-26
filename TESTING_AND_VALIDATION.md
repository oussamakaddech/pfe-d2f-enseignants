# Testing & Validation Guide - Frontend/Backend Integration Fixes

**Date**: 2026-05-27  
**Status**: Ready for Testing  
**All Critical Fixes Applied**: ✅

---

## Pre-Testing Checklist

Before running tests, ensure:

- [ ] Backend services are running:
  - [ ] Formation Service on port 8088
  - [ ] API Gateway on port 8080 (if using)
  - [ ] PostgreSQL database connected
  - [ ] All migrations applied (27 Flyway migrations)

- [ ] Frontend development setup:
  - [ ] Node.js dependencies installed (`npm install`)
  - [ ] Development server configured to run on port 5173
  - [ ] .env file configured with correct API URLs

- [ ] Network connectivity:
  - [ ] No firewall blocks between frontend (5173) and backend (8088)
  - [ ] CORS properly configured on backend
  - [ ] JWT authentication ready

---

## Test 1: API Path Verification ✅

### Step 1.1: Verify Frontend Service Paths

All frontend services have been updated to use `/api/v1/` prefix.

**Check the following files have correct paths:**

```bash
# Formation Workflow Service
grep "api/v1/formations-workflow" esprit_D2F-webapp/src/services/formation/FormationWorkflowService.ts
# Expected: /api/v1/formations-workflow ✓

# Formation Service  
grep "api/v1/formations" esprit_D2F-webapp/src/services/formation/FormationService.ts
# Expected: /api/v1/formations ✓

# Department Service
grep "api/v1/departements" esprit_D2F-webapp/src/services/formation/DeptService.ts
# Expected: /api/v1/departements ✓

# Seance Service
grep "api/v1/seances" esprit_D2F-webapp/src/services/formation/SeanceService.ts
# Expected: /api/v1/seances ✓

# Inscription Service
grep "api/v1/inscription" esprit_D2F-webapp/src/services/formation/InscriptionService.ts
# Expected: /api/v1/inscription ✓

# Document Service
grep "api/v1/documents" esprit_D2F-webapp/src/services/formation/DocumentService.ts
# Expected: /api/v1/documents ✓

# Enseignant Service
grep "api/v1/enseignants" esprit_D2F-webapp/src/services/formation/EnseignantService.ts
# Expected: /api/v1/enseignants ✓

# Formation Report Service
grep "api/v1/formation-report" esprit_D2F-webapp/src/services/formation/FormationReportService.ts
# Expected: /api/v1/formation-report ✓

# Formation Custom Service
grep "api/v1/formations-custom" esprit_D2F-webapp/src/services/formation/FormationCustomService.ts
# Expected: /api/v1/formations-custom ✓
```

**Status**: ✅ All paths verified and corrected

---

## Test 2: Backend API Connectivity

### Step 2.1: Test Formation Service Health

Once backend is running:

```bash
# Check if Formation Service is running
curl http://localhost:8088/actuator/health

# Expected Response:
# {"status":"UP"} or {"status":"DOWN"} (with details)
# Status Code: 200
```

### Step 2.2: Test Formation Endpoints with JWT

First, obtain a valid JWT token:

```bash
# Get JWT token from auth service or use test token:
JWT_TOKEN="<your-valid-jwt-token>"

# Test GET /api/v1/formations-workflow (list all formations)
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8088/api/v1/formations-workflow

# Expected: 200 OK with formations list
# If 401: JWT token is invalid or expired
# If 404: Endpoint not found (API path issue)
# If 500: Internal server error
```

### Step 2.3: Test Search Endpoints

```bash
JWT_TOKEN="<your-valid-jwt-token>"

# Search by title
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8088/api/v1/formations/search/by-title?title=Spring"

# Search by state
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8088/api/v1/formations/search/by-state?state=ACHEVEE"

# Advanced search
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Java",
    "etat": "EN_COURS"
  }' \
  http://localhost:8088/api/v1/formations/search/advanced
```

---

## Test 3: React Forms Validation ✅

### Step 3.1: Form Type Check

The codebase uses **Ant Design Forms** (NOT React Hook Form).

This is correct and requires:
- `Form.Item` with `name` prop (✅ Already implemented)
- NOT `{...register(...)}` (which is React Hook Form pattern)

**Example of correct Ant Design Form pattern (already in use):**

```tsx
const [form] = Form.useForm();

<Form form={form} layout="vertical" onFinish={handleSubmit}>
  <Form.Item label="Title" name="titreFormation" rules={[{ required: true }]}>
    <Input placeholder="Formation Title" />
  </Form.Item>
  <Form.Item label="Type" name="typeFormation" rules={[{ required: true }]}>
    <Select>
      <Option value="INTERNE">Internal</Option>
      <Option value="EXTERNE">External</Option>
    </Select>
  </Form.Item>
</Form>
```

**Status**: ✅ Forms are correctly implemented with Ant Design

---

## Test 4: Frontend Application Testing

### Step 4.1: Start Development Server

```bash
cd esprit_D2F-webapp
npm install
npm run dev

# Expected: Server running on http://localhost:5173
```

### Step 4.2: Test in Browser

1. **Navigate to Formation Page**
   - URL: `http://localhost:5173/formations`
   - Check Network tab in DevTools (F12)
   - Verify API calls go to `http://localhost:8088/api/v1/...`

2. **Monitor Console**
   - No "Maximum update depth exceeded" errors
   - No variable initialization errors
   - No 404 errors for API calls

3. **Test Form Submission**
   - Create new formation
   - Verify POST to `/api/v1/formations-workflow` succeeds
   - Check response status is 201 Created

### Step 4.3: Browser Console Testing

```javascript
// Open DevTools Console and run:

// Test 1: Check API configuration
fetch('http://localhost:8088/api/v1/formations', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer <your-jwt-token>',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✓ API Working:', data))
.catch(err => console.error('✗ API Error:', err))

// Test 2: List all formations
fetch('http://localhost:8088/api/v1/formations-workflow', {
  headers: { 'Authorization': 'Bearer <your-jwt-token>' }
})
.then(r => r.json())
.then(data => console.log('Formations:', data))

// Test 3: Search formations
fetch('http://localhost:8088/api/v1/formations/search/by-title?title=test', {
  headers: { 'Authorization': 'Bearer <your-jwt-token>' }
})
.then(r => r.json())
.then(data => console.log('Search Results:', data))
```

---

## Test 5: Variable Initialization Fix ✅

### Step 5.1: Test Competence Structure Page

```bash
# Navigate to: http://localhost:5173/competence/structure
# or
# Navigate to: RICE workflow → Step 2 (Review Step)
```

### Expected Behavior:
- [ ] Page loads without errors
- [ ] Console shows NO "ReferenceError: Cannot access 'openNiveauModal' before initialization"
- [ ] Competence tree renders correctly
- [ ] Clicking "Niveaux" tags opens modal
- [ ] No infinite loops or re-render warnings

**Status**: ✅ Variable initialization order fixed

---

## Test 6: API Response Validation

### Step 6.1: Verify Response Format

All API responses should follow this pattern:

```json
{
  "id": 1,
  "titreFormation": "Advanced Java Development",
  "typeFormation": "INTERNE",
  "dateDebut": "2026-06-01",
  "dateFin": "2026-06-30",
  "chargeHoraireGlobal": 40,
  "etat": "EN_COURS",
  "createdAt": "2026-05-27T10:30:00Z",
  "updatedAt": "2026-05-27T10:30:00Z"
}
```

### Step 6.2: Error Response Validation

Failed requests should return proper HTTP status codes:

```
400 Bad Request - Invalid input
401 Unauthorized - Missing/invalid JWT
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found (check API path!)
500 Internal Server Error - Backend error (check logs)
```

---

## Test 7: End-to-End Workflow

### Complete Formation Lifecycle Test

1. **Create Formation**
   ```bash
   curl -X POST http://localhost:8088/api/v1/formations-workflow \
     -H "Authorization: Bearer $JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "titreFormation": "Test Formation",
       "typeFormation": "INTERNE",
       "dateDebut": "2026-06-01",
       "dateFin": "2026-06-30"
     }'
   # Expected: 201 Created with formation ID
   ```

2. **List Formations**
   ```bash
   curl http://localhost:8088/api/v1/formations-workflow \
     -H "Authorization: Bearer $JWT"
   # Expected: 200 OK with formations array
   ```

3. **Get Specific Formation**
   ```bash
   curl http://localhost:8088/api/v1/formations-workflow/{id} \
     -H "Authorization: Bearer $JWT"
   # Expected: 200 OK with formation details
   ```

4. **Search Formations**
   ```bash
   curl "http://localhost:8088/api/v1/formations/search/by-title?title=Test" \
     -H "Authorization: Bearer $JWT"
   # Expected: 200 OK with matching formations
   ```

5. **Update Formation** (if endpoint exists)
   ```bash
   curl -X PUT http://localhost:8088/api/v1/formations/{id} \
     -H "Authorization: Bearer $JWT" \
     -H "Content-Type: application/json" \
     -d '{"titreFormation": "Updated Title"}'
   # Expected: 200 OK with updated formation
   ```

---

## Troubleshooting Guide

### Issue: 404 Not Found on API calls

**Cause**: API path is still incorrect

**Solution**:
```bash
# Verify the path in service file
grep -r "FORMATION_URL" esprit_D2F-webapp/src/services/formation/

# Should show: /api/v1/formations (not /formation/formations)
# If not, run the fixes again
```

### Issue: 401 Unauthorized

**Cause**: JWT token is missing or invalid

**Solution**:
```bash
# Verify JWT token is being sent
# In browser DevTools → Network → Click API call → Headers
# Look for: Authorization: Bearer <token>

# If missing, check auth service is providing tokens
# If expired, refresh token or get new one
```

### Issue: CORS Error

**Cause**: Backend CORS not configured properly

**Solution**:
```bash
# Backend should have CORS configured
# Check application.properties for:
# cors.allowed-origins=http://localhost:5173
# cors.allowed-methods=*
# cors.allowed-headers=*

# If issues persist, check GlobalExceptionHandler is configured with CORS
```

### Issue: "Maximum update depth exceeded"

**Cause**: Component state setters in effects without proper dependencies

**Solution**:
```bash
# Check React DevTools Profiler for which component is causing issue
# Verify useEffect dependencies are complete
# Check useCallback dependencies include all used variables
```

### Issue: Variable initialization errors

**Cause**: Function referenced in dependency array before definition

**Solution**: Already fixed in useStructureData.tsx
```bash
# Verify openNiveauModal is defined before buildSousCompNode
grep -n "openNiveauModal\|buildSousCompNode" \
  esprit_D2F-webapp/src/hooks/competence/useStructureData.tsx
# openNiveauModal should appear before buildSousCompNode
```

---

## Success Criteria

All fixes are considered successful when:

- [ ] ✅ No 404 errors when calling Formation APIs
- [ ] ✅ All API calls return proper status codes
- [ ] ✅ JWT authentication works (200 OK, not 401)
- [ ] ✅ Forms submit successfully with 201 Created
- [ ] ✅ No "Maximum update depth exceeded" warnings
- [ ] ✅ No "Cannot access variable before initialization" errors
- [ ] ✅ RICE workflow loads structure without errors
- [ ] ✅ Search endpoints return results with 200 OK
- [ ] ✅ All console errors are resolved

---

## Next Steps: PHASE 3

Once all tests pass, you're ready to implement PHASE 3:

1. **Competence Integration** (Week 1)
   - Link formations to competency frameworks
   - Create formation_competence table (Flyway V28)
   - Add FormationCompetenceService

2. **Certificate Generation** (Week 2)
   - Create formation_certificate table (Flyway V29)
   - Implement PDF generation with iText 7
   - Add certificate verification endpoints

See `PHASE3_IMPLEMENTATION_PLAN.md` for detailed specifications.

---

**Testing Ready**: 🟢 All fixes applied and documented  
**Backend Required**: Formation Service must be running on port 8088  
**Frontend Ready**: All paths corrected and forms validated
