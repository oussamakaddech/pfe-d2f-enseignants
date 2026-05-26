# PHASE 3 - Formation Service Enhancement Plan

**Status**: Planning  
**Target Features**: Competence Integration + Certificate Generation  
**Estimated Timeline**: 2-3 weeks

---

## Executive Summary

PHASE 3 extends Formation Service with enterprise capabilities:
1. **Competence Integration** - Link formations to competency frameworks and track skill development
2. **Certificate Generation** - Create professional training completion certificates with embedded metadata

---

## Feature 1: Competence Integration

### Goals
- Link formations to competencies defined in Competence Service
- Track competencies acquired through formation completion
- Enable competency-based training pathways
- Support cross-service synchronization

### Data Model Changes

```sql
-- New table: formation_competence (linking table)
CREATE TABLE formation.formation_competence (
    id SERIAL PRIMARY KEY,
    formation_id BIGINT REFERENCES formation.formation(id_formation) ON DELETE CASCADE,
    competence_id BIGINT NOT NULL,  -- References competence-service database
    niveau_minimum VARCHAR(50),  -- e.g., "INTERMEDIATE", "ADVANCED"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formation_id, competence_id)
);

-- Alter inscription table to track competency achievement
ALTER TABLE formation.inscription ADD COLUMN competence_level VARCHAR(50);
ALTER TABLE formation.inscription ADD COLUMN certification_issued_at TIMESTAMP;
```

### REST API Endpoints

#### Create Formation with Competencies
```
POST /api/formations
Content-Type: application/json

{
  "titreFormation": "Advanced Spring Boot Development",
  "typeFormation": "INTERNE",
  "chargeHoraireGlobal": 40,
  "competences": [
    {
      "competenceId": 1,
      "niveauMinimum": "INTERMEDIATE"
    },
    {
      "competenceId": 2,
      "niveauMinimum": "ADVANCED"
    }
  ]
}
```

#### Link Competence to Formation
```
POST /api/formations/{id}/competences
Content-Type: application/json

{
  "competenceId": 3,
  "niveauMinimum": "INTERMEDIATE"
}
```

#### Get Formation Competencies
```
GET /api/formations/{id}/competences
```

#### Get Competencies for Enseignant (Teacher) via Formation
```
GET /api/formations/{id}/inscriptions/{inscriptionId}/acquired-competences
```

### Implementation Tasks

1. **Database Migration** (V28)
   - Create formation_competence table
   - Add competence_level column to inscription
   - Create indexes on formation_id and competence_id

2. **Entity Updates**
   - Create `FormationCompetence` JPA entity
   - Add `@OneToMany` relationship in Formation entity
   - Add competence fields to Inscription entity

3. **DTO Creation**
   - `FormationCompetenceDTO` - Read/Write competence associations
   - `AcquiredCompetenceDTO` - Competencies gained from formation
   - Update `CreateFormationRequest` to include competences list

4. **Service Layer** (`FormationCompetenceService`)
   - `addCompetenceToFormation(formationId, competenceId, niveau)`
   - `removeCompetenceFromFormation(formationId, competenceId)`
   - `getFormationCompetences(formationId) → List<CompetenceInfo>`
   - `markCompetenceAcquired(inscriptionId, competenceId)`
   - `getAcquiredCompetences(inscriptionId) → List<AcquiredCompetenceDTO>`

5. **Repository Updates**
   - `FormationCompetenceRepository` with custom queries
   - Find formations by competence requirements
   - Find inscriptions with competence achievements

6. **Controller Endpoints**
   - Add endpoints in `FormationController`
   - Integrate with existing formation CRUD operations
   - Add @PreAuthorize for competence management (ADMIN/FORMATION_MANAGER only)

7. **Feign Client Integration**
   - Create `CompetenceServiceClient` to fetch competence details
   - Add fallback/hystrix for resilience
   - Cache competence metadata (with TTL)

8. **Testing**
   - Unit tests for FormationCompetenceService
   - Integration tests for competence association
   - Feign client mock tests
   - Controller endpoint tests

---

## Feature 2: Certificate Generation

### Goals
- Generate professional PDF certificates upon formation completion
- Include participant details, completion date, competencies acquired
- Support certificate templates and branding
- Enable certificate validation/verification

### Architecture

```
                     Formation Service
                            |
                   ┌────────┼────────┐
                   |        |        |
         Certificate      PDF        Database
         Template Engine  Generator  (Certificates table)
                 (iText 7)
                   |
         ┌─────────┴────────┐
         |                  |
      HTML Templates    Certificate Registry
```

### Data Model

```sql
-- New table: formation_certificate (certificate registry)
CREATE TABLE formation.formation_certificate (
    id SERIAL PRIMARY KEY,
    inscription_id BIGINT REFERENCES formation.inscription(id) ON DELETE CASCADE,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CERT-2026-00001"
    pdf_path VARCHAR(255) NOT NULL,  -- Storage path
    issued_date TIMESTAMP NOT NULL,
    expiration_date TIMESTAMP,  -- Optional
    verified_at TIMESTAMP,
    verification_hash VARCHAR(256),  -- For tamper detection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table to track competencies on certificate
CREATE TABLE formation.certificate_competence (
    id SERIAL PRIMARY KEY,
    certificate_id BIGINT REFERENCES formation.formation_certificate(id) ON DELETE CASCADE,
    competence_id BIGINT NOT NULL,
    competence_name VARCHAR(255),
    niveau_atteint VARCHAR(50),
    created_at TIMESTAMP
);
```

### REST API Endpoints

#### Generate Certificate
```
POST /api/formations/{formationId}/inscriptions/{inscriptionId}/certificate/generate
```

Response:
```json
{
  "id": 1,
  "certificateNumber": "CERT-2026-00001",
  "downloadUrl": "/api/certificates/1/download",
  "verificationUrl": "https://d2f.esprit.tn/verify/CERT-2026-00001",
  "issuedDate": "2026-05-26",
  "pdfPath": "/certificates/CERT-2026-00001.pdf"
}
```

#### Download Certificate
```
GET /api/certificates/{certificateId}/download
(Returns PDF file)
```

#### Verify Certificate
```
GET /api/certificates/verify/{certificateNumber}
```

Response:
```json
{
  "valid": true,
  "certificateNumber": "CERT-2026-00001",
  "participant": "John Doe",
  "formation": "Advanced Spring Boot",
  "issuedDate": "2026-05-26",
  "competencies": [
    {
      "name": "Spring Framework",
      "level": "ADVANCED"
    }
  ]
}
```

#### List Certificates for Enseignant
```
GET /api/enseignants/{enseignantId}/certificates
```

### Implementation Tasks

1. **Database Migration** (V29)
   - Create formation_certificate table
   - Create certificate_competence table
   - Add indexes for certificate_number and verification_hash

2. **Entity Classes**
   - `FormationCertificate` JPA entity
   - `CertificateCompetence` JPA entity
   - Relationships with Inscription and FormationCompetence

3. **DTO Classes**
   - `FormationCertificateDTO` - Certificate metadata
   - `CertificateGenerationRequest` - Input for certificate generation
   - `CertificateVerificationResponse` - Public verification data

4. **Service Layer** (`CertificateService`)
   - `generateCertificate(inscriptionId) → FormationCertificateDTO`
   - `retrieveCertificate(certificateId) → byte[] (PDF)`
   - `verifyCertificate(certificateNumber) → CertificateVerificationResponse`
   - `listCertificatesForEnseignant(enseignantId)`
   - `generateCertificateNumber() → String`
   - `generateVerificationHash() → String`

5. **PDF Generation** (`CertificateGeneratorService`)
   - Use iText 7 for PDF generation (already dependency)
   - HTML template → PDF conversion
   - Support for:
     - Header/footer with institution logo
     - Participant name, formation title
     - Completion date and hours
     - Competencies acquired with levels
     - Certificate number and verification QR code
     - Digital signature support

6. **Template Engine**
   - Thymeleaf or Freemarker for HTML templates
   - Template variables: `${participantName}`, `${formationTitle}`, etc.
   - Store templates in `classpath:/templates/certificates/`

7. **File Storage**
   - Store PDFs in `${app.certificate.storage.path}` (externalized)
   - Generate structured paths: `/certificates/2026/05/CERT-2026-00001.pdf`
   - Implement cleanup job for expired certificates

8. **Security & Verification**
   - HMAC-SHA256 verification hash generation
   - Public certificate verification endpoint (no auth required)
   - Prevent tampering through hash validation
   - Optional: Digital signature using private key

9. **Controller Endpoints**
   - `POST /api/formations/{id}/inscriptions/{id}/certificate/generate`
   - `GET /api/certificates/{id}/download`
   - `GET /api/certificates/verify/{number}`
   - `GET /api/enseignants/{id}/certificates`

10. **Configuration**
    - Add application properties:
      ```properties
      app.certificate.storage.path=/var/certificates
      app.certificate.issuer.name=ESPRIT University
      app.certificate.validity.days=365
      app.certificate.template.location=classpath:/templates/certificates/
      app.certificate.logo.path=/images/esprit-logo.png
      ```

11. **Testing**
    - Unit tests for CertificateService
    - PDF generation tests with assertions
    - Verification hash validation tests
    - Integration tests for certificate endpoints
    - Controller tests with PDF response validation

---

## Implementation Order

### Week 1: Competence Integration
1. Database migrations (V28)
2. Entity and DTO creation
3. FormationCompetenceService implementation
4. CompetenceServiceClient (Feign) integration
5. Controller endpoints
6. Unit and integration tests

### Week 2: Certificate Generation
1. Database migration (V29)
2. Entity and DTO creation
3. CertificateService implementation
4. HTML template creation
5. PDF generation service with iText
6. Controller endpoints
7. Verification endpoint implementation

### Week 3: Integration & Testing
1. End-to-end testing (formation → completion → certificate)
2. Performance testing
3. Security validation
4. Documentation
5. Deploy to staging environment

---

## Dependencies to Add

```xml
<!-- For Competence Service Integration (already present in auth-service) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>

<!-- iText is already present for PDF generation -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>7.2.5</version>
</dependency>

<!-- Optional: HTML to PDF (alternative approach) -->
<dependency>
    <groupId>org.xhtmlrenderer</groupId>
    <artifactId>core-renderer</artifactId>
    <version>R8</version>
</dependency>
```

---

## Risk Mitigation

### Risks & Solutions

| Risk | Mitigation |
|------|-----------|
| Competence Service unavailable | Implement circuit breaker; cache competence metadata |
| PDF generation performance | Async generation; queue system for bulk certificates |
| Certificate storage disk space | Implement retention policy; archive old certificates |
| Template rendering errors | Comprehensive template validation; fallback templates |
| Certificate verification security | HMAC validation; rate limiting on verify endpoint |

---

## Success Criteria

- ✓ Formations can link to multiple competencies
- ✓ Competencies displayed in formation details
- ✓ Certificates generated automatically on inscription approval
- ✓ Certificates downloadable as PDF
- ✓ Certificate verification works without authentication
- ✓ All endpoints tested with >80% coverage
- ✓ Performance: Certificate generation < 5 seconds
- ✓ Database migrations execute successfully

---

## Git Workflow

```bash
# Feature branches
git checkout -b feature/competence-integration
git checkout -b feature/certificate-generation

# Commits follow pattern
git commit -m "feat(competence): add FormationCompetence entity and repository"
git commit -m "feat(certificate): implement CertificateService and PDF generation"
git commit -m "test(certificate): add integration tests for certificate generation"

# Final PR merge to develop
git checkout develop
git merge --no-ff feature/competence-integration
git merge --no-ff feature/certificate-generation
```

---

## Deployment Checklist

- [ ] All migrations run successfully on staging
- [ ] Certificate storage directory created and writable
- [ ] Competence Service endpoints accessible
- [ ] JWT tokens include necessary scopes
- [ ] PDF generation tested in target environment
- [ ] Database backups completed
- [ ] Load testing completed (certificate generation)
- [ ] Security review of verification endpoint
- [ ] Documentation updated
- [ ] Monitoring and alerting configured

---

## Next Phase (PHASE 4 - Suggested)

- **Formation Notifications**: Email notifications for registrations/completions
- **Analytics Dashboard**: Formation completion rates and participation metrics
- **Advanced Reporting**: PDF reports for training analysis and ROI
- **Mobile Application**: Mobile app for formation discovery and certificate viewing

---

**Plan Created**: 2026-05-26  
**Status**: Ready for Implementation  
**Assigned to**: Formation Service Team
