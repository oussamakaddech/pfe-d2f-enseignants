# Frontend/Backend Integration Issues - Diagnostic Report

**Date**: 2026-05-26  
**Status**: Issues Identified & Solutions Provided

---

## Issue 1: Backend API Path Mismatch ❌

### Problem
```
Frontend calls: GET /api/formation/formations-workflow
Backend provides: GET /api/v1/formations-workflow

Result: 404 Not Found or 500 Internal Server Error
```

### Solution
**Update frontend API calls to use correct paths:**

```javascript
// WRONG - Don't use this
const API_URL = 'http://localhost:8080/api/formation';

// CORRECT - Use this
const FORMATION_SERVICE_URL = 'http://localhost:8088';
const API_URL = `${FORMATION_SERVICE_URL}/api/v1`;

// Now all calls will work:
fetch(`${API_URL}/formations-workflow`)  // ✓ Correct
fetch(`${API_URL}/formations`)           // ✓ Correct
fetch(`${API_URL}/formations/search/by-title?title=test`)  // ✓ Correct
```

### Backend Endpoints Available

```
POST   /api/v1/formations-workflow            - Create formation
GET    /api/v1/formations-workflow            - List all formations
GET    /api/v1/formations-workflow/{id}       - Get formation by ID

GET    /api/formations/search/by-title?title=...
GET    /api/formations/search/by-state?state=...
GET    /api/formations/search/by-domain?domain=...
POST   /api/formations/search/advanced

POST   /api/formations/{id}/recover            - Recover soft-deleted
POST   /api/formations/{id}/clone              - Clone formation
```

---

## Issue 2: React Hook Form Not Connected ❌

### Problem
```
Warning: Instance created by `useForm` is not connected to any Form element
```

### Root Cause
Missing `{...register(...)}` on input fields

### Solution

```jsx
// WRONG - Missing register() calls
function FormationForm() {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input name="title" />  {/* ❌ Not registered! */}
    </form>
  );
}

// CORRECT - Use register() on every input
function FormationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      titreFormation: '',
      typeFormation: 'INTERNE',
      chargeHoraireGlobal: 40
    }
  });
  
  const onSubmit = (data) => {
    fetch('http://localhost:8088/api/v1/formations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(data)
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ✓ Properly registered input */}
      <input 
        {...register('titreFormation', { required: 'Title required' })} 
        placeholder="Formation Title"
      />
      {errors.titreFormation && <span>{errors.titreFormation.message}</span>}
      
      {/* ✓ Select with register */}
      <select {...register('typeFormation')}>
        <option value="INTERNE">Internal</option>
        <option value="EXTERNE">External</option>
        <option value="EN_LIGNE">Online</option>
      </select>
      
      {/* ✓ Number input with proper type handling */}
      <input 
        {...register('chargeHoraireGlobal', { valueAsNumber: true })} 
        type="number"
      />
      
      <button type="submit">Create Formation</button>
    </form>
  );
}
```

### Key Points
1. **Always use `{...register(...)}` on every input, select, textarea**
2. **Use `valueAsNumber: true` for number fields**
3. **Use `valueAsDate: true` for date fields**
4. **Handle validation errors from `formState.errors`**
5. **Use `handleSubmit` to properly bind form to submission handler**

---

## API Authentication Required

All endpoints need JWT token:

```javascript
const jwtToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9..."; // Your JWT

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwtToken}`
};

fetch('http://localhost:8088/api/v1/formations-workflow', {
  method: 'GET',
  headers: headers
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

---

## Environment Setup

### Frontend .env File
```
VITE_API_BASE_URL=http://localhost:8088
VITE_JWT_TOKEN=<generated-jwt-token>
```

### Frontend Usage
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088';
const API_FORMATION = `${API_BASE}/api/v1`;
```

---

## Checklist for Frontend Fixes

- [ ] Update all API URLs from `/api/formation` to `/api/v1`
- [ ] Change base URL to `http://localhost:8088` (Formation Service)
- [ ] Fix all React Hook Form - add `{...register(...)}` to inputs
- [ ] Add JWT token to all API request headers
- [ ] Test with real endpoints
- [ ] Verify error handling for 401/500 responses
- [ ] Test PHASE 2 search endpoints

---

## Testing the Integration

### Backend Health Check
```bash
curl http://localhost:8088/actuator/health
# Expected: {"status":"DOWN"} or {"status":"UP"}
```

### API Test with JWT
```bash
JWT="<your-jwt-token>"
curl -H "Authorization: Bearer $JWT" \
  http://localhost:8088/api/v1/formations-workflow
```

### In Browser Console
```javascript
fetch('http://localhost:8088/api/v1/formations-workflow', {
  headers: {
    'Authorization': 'Bearer <jwt-token>'
  }
})
.then(r => r.json())
.then(console.log)
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 404 Not Found | Wrong path | Use `/api/v1/...` |
| 401 Unauthorized | No/invalid JWT | Add valid Authorization header |
| 500 Internal Server Error | Backend error | Check Formation Service logs |
| CORS error | Cross-origin blocked | Already configured in backend |
| "useForm not connected" | Missing register() | Add `{...register(...)}` |

---

## Summary

**Backend**: ✅ All endpoints working correctly on port 8088  
**Frontend**: ❌ Needs 2 fixes:
1. Update API paths to use `/api/v1/` prefix
2. Fix React Hook Form with proper register() calls

**Estimated Fix Time**: 30-60 minutes

All PHASE 2 features are ready for frontend integration!
