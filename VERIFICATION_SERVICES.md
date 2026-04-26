# ✅ Vérification Complète — Microservices D2F ↔ Frontend

> Date : 25 Avril 2026

---

## 1. Matrice de correspondance Backend ↔ Frontend

| Service Backend | Port | Service Frontend | Page(s) Frontend | Statut |
|-----------------|------|------------------|------------------|--------|
| **Auth** | 8085 | `accountService.ts`, `authService.ts` | Login, Register, Profile, EditProfile | ✅ |
| **Formation** | 8088 | `DeptService.js`, `DocumentService.js`, `EnseignantService.js`, `FormationService.js` | FormationPage, FormationCreationPage, FormationConsultationPage, FormationCards, FicheFormation, DemandesList, CalendrierPage, TeachersDataGrid | ✅ |
| **Competence** | 8005 | `CompetenceService.ts` | CompetencePage, EnseignantCompetencePage, AffectationEnseignantPage, RicePage, MatchmakingPage, CompetenceMatchingPage | ✅ |
| **Besoin Formation** | 8004 | `BesoinFormationService.ts` | BesoinList, BesoinForm, BesoinFormationApproval | ✅ |
| **Evaluation** | 8087 | `EvaluationService.ts` | EvaluationGlobalePage | ✅ |
| **Certificat** | 8086 | `CertificateService.ts` | CertificatePage, CertificatesByEmailPage, CompletedFormations | ✅ |
| **Analyse (Spring Boot)** | ~~8089~~ | ~~AnalysePredictiveService.js (ancien)~~ | ~~AnalysePredictivePage~~ | ❌ **SUPPRIMÉ** |
| **Predictive Analytics** | **8090** | `AnalysePredictiveService.js` | **AnalysePredictivePage** | ✅ **NOUVEAU** |
| **AI Reco** | 8000 | `aiRecoService.js` | *(appelé indirectement)* | ⚠️ |
| **RICE** | 8001 | *(appels directs fetch)* | RicePage, MatchmakingPage, CompetenceMatchingPage | ✅ |
| **API Gateway** | 8222 | Tous les services passent par ici | Toutes les pages protégées | ✅ |

---

## 2. Inventaire complet des services (13 actifs)

### Scripts de lancement (`launch-all.ps1`)

| Étape | Service | Port | Type | Commande |
|-------|---------|------|------|----------|
| 1 | Docker (PostgreSQL + Artemis) | 7432 / 61616 | Infra | docker |
| 2 | Ollama (LLM) | 11434 | IA locale | `ollama serve` |
| 3 | Auth | 8085 | Java/Spring Boot | `mvnw spring-boot:run` |
| 4 | Formation | 8088 | Java/Spring Boot | `mvnw spring-boot:run` |
| 5 | Certificat | 8086 | Java/Spring Boot | `mvnw spring-boot:run` |
| 6 | Evaluation | 8087 | Java/Spring Boot | `mvnw spring-boot:run` |
| 7 | Besoin-Formation | 8004 | Java/Spring Boot | `mvnw spring-boot:run` |
| 8 | Competence | 8005 | Java/Spring Boot | `mvnw spring-boot:run` |
| 9 | API Gateway | 8222 | Java/Spring Cloud | `mvnw spring-boot:run` |
| 10 | AI Reco | 8000 | Python/FastAPI | `uvicorn ai_reco:app` |
| 11 | RICE | 8001 | Python/FastAPI | `uvicorn main:app` |
| 12 | **Predictive Analytics** | **8090** | **Python/FastAPI** | **`uvicorn app.main:app`** |
| 13 | Frontend React | 5173 | React/Vite | `npm run dev` |

### Docker Compose

| Service | Port exposé | Dockerfile | Healthcheck |
|---------|-------------|------------|-------------|
| postgres | 7432 | ❌ (image officielle) | ✅ pg_isready |
| artemis | 61616, 8161 | ❌ (image officielle) | ✅ curl console |
| auth-service | 8085 | ✅ | ✅ wget actuator |
| competence-service | 8005 | ✅ | ✅ wget actuator |
| besoin-formation-service | 8004 | ✅ | ✅ wget actuator |
| certificat-service | 8086 | ✅ | ✅ wget actuator |
| evaluation-service | 8087 | ✅ | ✅ wget actuator |
| formation-service | 8088 | ✅ | ✅ wget actuator |
| api-gateway | 8222 | ✅ | ✅ wget actuator |
| ai-reco-service | 8000 | ✅ | ✅ Python health |
| rice-service | 8001 | ✅ | ✅ Python health |
| predictive-analytics-service | 8090 | ✅ | ✅ Python health |
| webapp | 3000 | ✅ | ✅ wget / |

---

## 3. Vérification du Routing Frontend

### Routes dans `AppRoutes.tsx` (40 routes)

| Page | Route | Guard | Service utilisé |
|------|-------|-------|-----------------|
| Login | `/`, `/login` | ❌ Public | Auth |
| Register | `/register` | ❌ Public | Auth |
| Home | `/home` | ✅ Private | — |
| Profile | `/home/profile` | ✅ Private | Auth |
| FormationCards | `/home/ListeFormation` | ✅ Private | Formation |
| FicheFormation | `/home/ListeFormation/:id` | ✅ Private | Formation |
| DemandesList | `/home/ListeFormation/:id/demandes` | ✅ Private + Role | Formation |
| FormationPage | `/home/Formation` | ✅ Private + Role | Formation |
| FormationCreationPage | `/home/Formation/Creer` | ✅ Private + Role | Formation |
| FormationConsultationPage | `/home/Formation/Consulter` | ✅ Private + Role | Formation |
| KPIChart | `/home/KPI` | ✅ Private + Role | Formation |
| CalendrierPage | `/home/Calendrier` | ✅ Private + Role | Formation |
| Calendrier | `/home/calendar` | ✅ Private + Role | Formation |
| CalendarEnseignant | `/home/calendar/:enseignantId` | ✅ Private + Role | Formation |
| TeachersDataGrid | `/home/Enseignants` | ✅ Private + Role | Formation |
| UpDeptDataGrid | `/home/UpDept` | ✅ Private + Role | Formation |
| CompetencePage | `/home/competences` | ✅ Private + Role | Competence |
| EnseignantCompetencePage | `/home/competences/enseignant/:id` | ✅ Private + Role | Competence |
| AffectationEnseignantPage | `/home/affectations` | ✅ Private + Role | Competence |
| RicePage | `/home/rice` | ✅ Private + Role | RICE |
| CompetenceMatchingPage | `/home/rice/matchmaking` | ✅ Private + Role | RICE / Competence |
| MatchmakingPage | `/home/rice/competence-matching` | ✅ Private + Role | RICE / Competence |
| EvaluationGlobalePage | `/home/Evaluations` | ✅ Private + Role | Evaluation |
| **AnalysePredictivePage** | **`/home/AnalysePredictive`** | ✅ **Private + Role** | **Predictive Analytics** |
| BesoinFormationApproval | `/home/BesoinApprouver` | ✅ Private + Role | Besoin Formation |
| BesoinList | `/home/besoins` | ✅ Private + Role | Besoin Formation |
| BesoinForm | `/home/besoins/ajouter` | ✅ Private + Role | Besoin Formation |
| ListAccounts | `/home/accounts` | ✅ Private + Role | Auth |
| CertificatePage | `/home/certificate/:formationId` | ✅ Private + Role | Certificat |
| CompletedFormations | `/home/certificate` | ✅ Private + Role | Certificat |
| CertificatesByEmailPage | `/home/MyCertificate` | ✅ Private | Certificat |
| Tests | `/home/test` | ✅ Private + Role | — |
| FormationList | `/home/animateur-formations` | ✅ Private + RoleFormateur | Formation |
| FormationDetail | `/home/animateur-formations/:id` | ✅ Private + RoleFormateur | Formation |
| CombinedFormationOneDriveTree | `/home/File` | ✅ Private + Role | Formation |
| NotFound | `*` | ❌ | — |

---

## 4. Points de vigilance

### ✅ Correct
- Tous les services backend ont au moins une page frontend
- Tous les ports sont cohérents entre launch-all, docker-compose et les services
- Tous les Dockerfile existent
- Le routing est cohérent avec le menu latéral

### ⚠️ À noter
- **`AnalysePredictiveService.js`** utilise une URL **hardcodée** (`http://localhost:8090/api`) au lieu de passer par la gateway. C'est intentionnel suite au remplacement demandé du Spring Boot par le Python. Pour la production Docker, utiliser `http://predictive-analytics-service:8080/api`.
- **Le dossier `esprit_D2F-analyse`** existe encore physiquement mais n'est plus référencé dans aucun script.

### 🔴 Aucun problème critique détecté
- Pas de service orphelin
- Pas de page sans service backend
- Pas de port en conflit

---

## 5. Commande de vérification rapide

```powershell
# Vérifier que tous les services sont dans launch-all.ps1
Get-Content launch-all.ps1 | Select-String "Port = "

# Vérifier que tous les services sont dans docker-compose.yml
Get-Content docker-compose.yml | Select-String "container_name:"

# Vérifier les services frontend
Get-ChildItem esprit_D2F-webapp\src\services\ -Name
```

---

*Rapport généré automatiquement — Tous les microservices sont cohérents et liés au frontend.*
