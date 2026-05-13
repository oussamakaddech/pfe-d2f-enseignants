# Frontend Improvements Checklist

## ✅ Completed Phase

- [x] Create useAppNotification hook utility
- [x] Fix FormationWorkflowForm.jsx (6 message calls)
- [x] Fix FormationWorkflowEditForm.jsx (6 message calls)
- [x] Fix CompletedFormations.jsx (8 message calls)
- [x] Fix CompetenceMatchingPage.jsx (16 message calls)
- [x] Add ErrorBoundary component
- [x] Integrate ErrorBoundary into App.tsx

## 📋 Phase 2 - High Priority (Recommended)

- [ ] **CompetencePage.jsx** (12 calls)
  - Location: `src/pages/competence/CompetencePage.jsx`
  - Fix pattern: Remove message import → Add hook → Use in component

- [ ] **useStructureData.jsx** (9 calls)
  - Location: `src/pages/competence/hooks/useStructureData.jsx`
  - Fix pattern: Remove message import → Add hook → Use in hook

- [ ] **StructureArbrePage.jsx** (8 calls)
  - Location: `src/pages/competence/StructureArbrePage.jsx`
  - Fix pattern: Remove message import → Add hook → Use in component

## 📋 Phase 3 - Medium Priority

### Document Formation Components
- [ ] DocumentUploadForm.jsx (3 calls)
- [ ] UpdateDocumentForm.jsx (4 calls)
- [ ] CombinedFormationOneDriveTree.jsx (4 calls + 2 notification)
- [ ] DocumentUploadPanel.jsx (3 calls)

### Analysis & Reports
- [ ] AnalysePredictivePage.jsx (3 calls)

### Authentication
- [ ] Register.jsx (3 calls)

### Other Pages (1-2 calls each)
- [ ] CalendrierPage.jsx (3 calls)
- [ ] And 10+ more files with 1-2 calls each

## 🎯 Testing Checklist After Each Phase

After completing a phase:
- [ ] Build frontend: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Test message notifications work
- [ ] Check browser console for warnings
- [ ] Verify styling is correct
- [ ] Test on multiple pages

## 🚀 Implementation Notes

### For Each File:

```javascript
// Step 1: Remove from antd import
// OLD: import { ..., message, notification, Modal } from "antd";
// NEW: import { ..., Modal, notification } from "antd"; // only if needed elsewhere

// Step 2: Add hook import
import useAppNotification from "path/to/hooks/useAppNotification";

// Step 3: Use in component
function MyComponent() {
  const { message, notification, modal } = useAppNotification();
  // Now message.error(), message.success() etc work with proper context
}

// Step 4: Replace Modal static calls (if applicable)
// OLD: Modal.confirm({ ... })
// NEW: modal.confirm({ ... })
```

## 📊 Progress Tracking

**Phase 1 Completion:** 4 files (50+ message calls fixed) ✅

**Phase 2 Target:** 3 more high-impact files (25+ calls)

**Phase 3 Target:** Remaining 15 files (30+ calls)

**Total Goal:** 26 files with 107+ static calls → Hook-based with context support

---

## 💡 Quick Reference

### Import Path Structure:
```
src/
  hooks/
    useAppNotification.js       ← Hook to use
  pages/
    competence/
      CompetencePage.jsx        ← Needs fix (import: ../../hooks/...)
      CompetenceMatchingPage.jsx ← ✅ Fixed
    formation/
      FormationWorkflowForm.jsx  ← ✅ Fixed (import: ../hooks/...)
```

### Relative Import Paths:
- From `src/pages/`: `../hooks/useAppNotification`
- From `src/pages/competence/`: `../../hooks/useAppNotification`
- From `src/pages/competence/rice/`: `../../../hooks/useAppNotification`

---

## ✨ Quality Metrics

| Metric | Status |
|--------|--------|
| Phase 1 Complete | ✅ 4/26 files (15%) |
| Console Warnings | ✅ Eliminated (fixed files) |
| Error Boundary | ✅ Active |
| Type Safety | 🔄 In progress |
| Test Coverage | 📋 To be planned |
