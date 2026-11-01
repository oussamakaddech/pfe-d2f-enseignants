# AUDIT COMPARATIF COMPLET : CODE SOURCE vs DIAGRAMMES DE CLASSES

Nombre total de classes entités/MappedSuperclass dans le code Java : 44
Nombre de classes dans class_global_d2f_complet.puml : 33
Nombre de classes dans gen_class_global_d2f.py (SVG rapport) : 1

## 1. VÉRIFICATION DÉTAILLÉE PAR CLASSE (PUML vs CODE SOURCE)

### Classe : `AlertEvent`
- **Module** : Analyse Prédictive (FastAPI/Python + PostgreSQL table `analyse.*`)
- **Attributs diagramme** : `id, typeAlerte, enseignantId, severite, statut`

### Classe : `AnimateurExterne`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `id, nom, prenom, email`
- **Attributs code source (5)** : `id, nom, prenom, email, bureau`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['bureau']`

### Classe : `BaseAuditEntity`
- **Service Java** : `esprit_D2F-notification`
- **Hérite de** : `Aucun`
- **Attributs diagramme (5)** : `createdAt, updatedAt, createdBy, updatedBy, version`
- **Attributs code source (5)** : `createdAt, updatedAt, createdBy, updatedBy, version`

### Classe : `BesoinApprovalHistory`
- **Service Java** : `esprit_D2F-besoin-formation`
- **Hérite de** : `Aucun`
- **Attributs diagramme (5)** : `id, actorUsername, action, reason, createdAt`
- **Attributs code source (9)** : `id, besoinId, actorUsername, actorRole, action, fromStep, toStep, reason, createdAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['besoinId', 'actorRole', 'fromStep', 'toStep']`

### Classe : `BesoinCompetence`
- **Service Java** : `esprit_D2F-besoin-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (3)** : `id, competenceId, savoirId`
- **Attributs code source (9)** : `id, besoinId, domaineId, competenceId, competenceNom, savoirId, savoirNom, sousCompetenceId, sousCompetenceNom`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['besoinId', 'domaineId', 'competenceNom', 'savoirNom', 'sousCompetenceId', 'sousCompetenceNom']`

### Classe : `BesoinFormation`
- **Service Java** : `esprit_D2F-besoin-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (8)** : `idBesoinFormation, titre, typeBesoin, status, priorite, up, departement, createdByRole`
- **Attributs code source (47)** : `idBesoinFormation, username, typeBesoin, objectifFormation, propositionAnimateur, prerequis, publicCible, nbMaxParticipants, programmeFormation, dureeFormation, titre, theme, objectifsOperationnels, objectifsPedagogiques, methodesPedagogiques, moyensPedagogiques, methodesEvaluationAcquis, profilFormateur, horaireSouhaite, up, departement, approuveCUP, approuveChefDep, approuveAdmin, notificationMessage, eventPublished, createdByUserId, createdByRole, currentApprovalStep, status, rejectionReason, rejectedBy, rejectedAt, approvedByCup, approvedByChefDepartement, approvedByAdmin, priorite, impactStrategique, estOuverte, autresInformations, animateurs, enseignants, periodCode, customPeriodLabel, dateDebut, dateFin, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['username', 'objectifFormation', 'propositionAnimateur', 'prerequis', 'publicCible', 'nbMaxParticipants', 'programmeFormation', 'dureeFormation', 'theme', 'objectifsOperationnels', 'objectifsPedagogiques', 'methodesPedagogiques', 'moyensPedagogiques', 'methodesEvaluationAcquis', 'profilFormateur', 'horaireSouhaite', 'approuveCUP', 'approuveChefDep', 'approuveAdmin', 'notificationMessage', 'eventPublished', 'createdByUserId', 'currentApprovalStep', 'rejectionReason', 'rejectedBy', 'rejectedAt', 'approvedByCup', 'approvedByChefDepartement', 'approvedByAdmin', 'impactStrategique', 'estOuverte', 'autresInformations', 'animateurs', 'enseignants', 'periodCode', 'customPeriodLabel', 'dateDebut', 'dateFin', 'deletedAt']`

### Classe : `Bureau`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (3)** : `id, nom, email`
- **Attributs code source (4)** : `id, nom, email, numeroTelephone`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['numeroTelephone']`

### Classe : `Certificate`
- **Service Java** : `esprit_D2F-certificat`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (7)** : `idCertificate, certificateNumber, formationId, enseignantId, issuedAt, certificateStatus, verificationToken`
- **Attributs code source (25)** : `idCertificate, certificateNumber, verificationToken, verificationHash, issuedAt, certificateStatus, formationId, titreFormation, typeCertif, dateDebutFormation, dateFinFormation, chargeHoraireGlobal, enseignantId, nomEnseignant, prenomEnseignant, mailEnseignant, deptEnseignant, roleEnFormation, delivered, pdfFilePath, revokedAt, revokedBy, revocationReason, competencesValidees, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['verificationHash', 'titreFormation', 'typeCertif', 'dateDebutFormation', 'dateFinFormation', 'chargeHoraireGlobal', 'nomEnseignant', 'prenomEnseignant', 'mailEnseignant', 'deptEnseignant', 'roleEnFormation', 'delivered', 'pdfFilePath', 'revokedAt', 'revokedBy', 'revocationReason', 'competencesValidees', 'deletedAt']`

### Classe : `Competence`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `id, code, nom, ordre`
- **Attributs code source (12)** : `id, code, nom, description, prerequisiteManual, ordre, domaine, upIds, departementIds, sousCompetences, savoirs, prerequisite`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['description', 'prerequisiteManual', 'domaine', 'upIds', 'departementIds', 'sousCompetences', 'savoirs', 'prerequisite']`

### Classe : `CompetencePrerequisite`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `Aucun`
- **Attributs diagramme (2)** : `id, niveauMinimum`
- **Attributs code source (6)** : `id, competence, prerequisite, niveauMinimum, description, createdAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['competence', 'prerequisite', 'description', 'createdAt']`

### Classe : `Dept`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (2)** : `id, libelle`
- **Attributs code source (2)** : `id, libelle`

### Classe : `Document`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `idDocument, nomDocument, filePath, obligation`
- **Attributs code source (6)** : `idDocument, filePath, date, obligation, pathType, formation`
  - ℹ️ **Dans le diagramme mais absent du code Java** : `['nomDocument']`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['date', 'pathType', 'formation']`

### Classe : `Domaine`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (5)** : `id, code, nom, upId, departementId`
- **Attributs code source (8)** : `id, code, nom, description, actif, upId, departementId, competences`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['description', 'actif', 'competences']`

### Classe : `Enseignant`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (7)** : `id, nom, prenom, mail, grade, specialite, userId`
- **Attributs code source (22)** : `id, nom, prenom, mail, type, etat, cup, chefDepartement, grade, telephone, photoUrl, specialite, dateRecrutement, dossierStatus, dossierLastUpdate, dossierNotes, userId, up, dept, presences, inscriptions, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['type', 'etat', 'cup', 'chefDepartement', 'telephone', 'photoUrl', 'dateRecrutement', 'dossierStatus', 'dossierLastUpdate', 'dossierNotes', 'up', 'dept', 'presences', 'inscriptions', 'deletedAt']`

### Classe : `EnseignantCompetence`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `id, enseignantId, niveau, dateAcquisition`
- **Attributs code source (6)** : `id, enseignantId, savoir, niveau, dateAcquisition, commentaire`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['savoir', 'commentaire']`

### Classe : `EvaluationFormateur`
- **Service Java** : `esprit_D2F-evaluation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (5)** : `idEvalParticipant, formationId, enseignantId, note, satisfaisant`
- **Attributs code source (11)** : `idEvalParticipant, note, satisfaisant, commentaire, maitriseSujet, clarte, pedagogie, interaction, gestionTemps, enseignantId, formationId`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['commentaire', 'maitriseSujet', 'clarte', 'pedagogie', 'interaction', 'gestionTemps']`

### Classe : `EvaluationGlobale`
- **Service Java** : `esprit_D2F-evaluation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (6)** : `idEvalGlobale, formationId, enseignantId, noteGlobale, satisfactionGlobale, dateEvaluation`
- **Attributs code source (14)** : `idEvalGlobale, formationId, enseignantId, commentaireGeneral, dateEvaluation, noteGlobale, recommandation, pertinenceContenu, organisation, qualiteSupports, dureeAdaptee, satisfactionGlobale, lastRefreshDate, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['commentaireGeneral', 'recommandation', 'pertinenceContenu', 'organisation', 'qualiteSupports', 'dureeAdaptee', 'lastRefreshDate', 'deletedAt']`

### Classe : `Formation`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (8)** : `idFormation, titreFormation, typeFormation, etatFormation, dateDebut, dateFin, chargeHoraireGlobal, idBesoinFormation`
- **Attributs code source (49)** : `idFormation, idBesoinFormation, typeBesoin, titreFormation, domaine, competence, populationCible, objectifs, objectifsPedago, evalMethods, typeFormation, externeFormateurNom, externeFormateurPrenom, externeFormateurEmail, organismeRefExterne, bureauFormationNom, bureauFormationMail, bureauFormationTelephone, dateDebut, dateFin, etatFormation, coutTransport, coutHebergement, coutRepas, coutFormation, prerequis, acquis, indicateurs, chargeHoraireGlobal, certifGenerated, sourceCalendrier, seances, animateurs, animateursExternes, up, departement, documents, inscriptions, formationCompetences, inscriptionsOuvertes, ouverte, periodCode, customPeriodLabel, lastRefreshDate, salle, calendarEventId, responsableEmail, responsableName, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['typeBesoin', 'domaine', 'competence', 'populationCible', 'objectifs', 'objectifsPedago', 'evalMethods', 'externeFormateurNom', 'externeFormateurPrenom', 'externeFormateurEmail', 'organismeRefExterne', 'bureauFormationNom', 'bureauFormationMail', 'bureauFormationTelephone', 'coutTransport', 'coutHebergement', 'coutRepas', 'coutFormation', 'prerequis', 'acquis', 'indicateurs', 'certifGenerated', 'sourceCalendrier', 'seances', 'animateurs', 'animateursExternes', 'up', 'departement', 'documents', 'inscriptions', 'formationCompetences', 'inscriptionsOuvertes', 'ouverte', 'periodCode', 'customPeriodLabel', 'lastRefreshDate', 'salle', 'calendarEventId', 'responsableEmail', 'responsableName', 'deletedAt']`

### Classe : `FormationCompetence`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (5)** : `id, competenceId, savoirId, niveauPrerequis, niveauVise`
- **Attributs code source (12)** : `id, formation, domaineId, competenceId, competenceNom, sousCompetenceId, sousCompetenceNom, savoirId, savoirNom, savoirType, niveauPrerequis, niveauVise`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['formation', 'domaineId', 'competenceNom', 'sousCompetenceId', 'sousCompetenceNom', 'savoirNom', 'savoirType']`

### Classe : `Inscription`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `id, etat, dateTraitement, motif`
- **Attributs code source (7)** : `id, formation, enseignant, etat, dateDemande, dateTraitement, motif`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['formation', 'enseignant', 'dateDemande']`

### Classe : `LearningAssessment`
- **Service Java** : `esprit_D2F-evaluation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (6)** : `id, trainingId, participantId, type, score, competenceId`
- **Attributs code source (20)** : `id, trainingId, sessionId, participantId, type, score, maxScore, levelBefore, levelAfter, evaluatedBy, evaluatedAt, attemptNumber, competenceId, targetLevel, autoEvaluation, objectifsPersonnels, practicalScore, trainerComment, competencesAcquises, targetReached`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['sessionId', 'maxScore', 'levelBefore', 'levelAfter', 'evaluatedBy', 'evaluatedAt', 'attemptNumber', 'targetLevel', 'autoEvaluation', 'objectifsPersonnels', 'practicalScore', 'trainerComment', 'competencesAcquises', 'targetReached']`

### Classe : `NiveauSavoirRequis`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (2)** : `id, niveau`
- **Attributs code source (6)** : `id, competence, sousCompetence, niveau, savoir, description`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['competence', 'sousCompetence', 'savoir', 'description']`

### Classe : `Notification`
- **Service Java** : `esprit_D2F-notification`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (6)** : `idNotification, recipient, type, title, message, read`
- **Attributs code source (9)** : `idNotification, recipient, type, severity, title, message, read, link, actor`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['severity', 'link', 'actor']`

### Classe : `Presence`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `idParticipation, status, justification, recordedAt`
- **Attributs code source (11)** : `idParticipation, present, status, arrivalTime, departureTime, justification, commentaire, recordedBy, recordedAt, seanceFormation, enseignant`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['present', 'arrivalTime', 'departureTime', 'commentaire', 'recordedBy', 'seanceFormation', 'enseignant']`

### Classe : `Recommendation`
- **Module** : Analyse Prédictive (FastAPI/Python + PostgreSQL table `analyse.*`)
- **Attributs diagramme** : `id, enseignantId, formationId, scoreGlobal, raison`

### Classe : `Role`
- **Service Java** : `esprit_D2F-authentification`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (2)** : `id, name`
- **Attributs code source (2)** : `id, name`

### Classe : `Savoir`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (5)** : `id, code, nom, type, niveau`
- **Attributs code source (8)** : `id, code, nom, description, type, niveau, sousCompetence, competence`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['description', 'sousCompetence', 'competence']`

### Classe : `SeanceFormation`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (6)** : `idSeance, dateSeance, heureDebut, heureFin, numeroSeance, salle`
- **Attributs code source (19)** : `idSeance, dateSeance, heureDebut, heureFin, typeSeance, numeroSeance, totalSeances, sessionStatus, contenus, methodes, dureeTheorique, dureePratique, salle, calendarEventId, onlineMeetingUrl, formation, animateurs, participants, presences`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['typeSeance', 'totalSeances', 'sessionStatus', 'contenus', 'methodes', 'dureeTheorique', 'dureePratique', 'calendarEventId', 'onlineMeetingUrl', 'formation', 'animateurs', 'participants', 'presences']`

### Classe : `SkillGap`
- **Module** : Analyse Prédictive (FastAPI/Python + PostgreSQL table `analyse.*`)
- **Attributs diagramme** : `id, enseignantId, competenceId, gapScore, niveauUrgence, computedAt`

### Classe : `SousCompetence`
- **Service Java** : `esprit_D2F-competence`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (4)** : `id, code, nom, niveau`
- **Attributs code source (9)** : `id, code, nom, description, competence, parent, enfants, niveau, savoirs`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['description', 'competence', 'parent', 'enfants', 'savoirs']`

### Classe : `TeacherRiskSnapshot`
- **Module** : Analyse Prédictive (FastAPI/Python + PostgreSQL table `analyse.*`)
- **Attributs diagramme** : `id, enseignantId, snapshotDate, scoreRisque, niveauRisque`

### Classe : `Up`
- **Service Java** : `esprit_D2F-formation`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (2)** : `id, libelle`
- **Attributs code source (2)** : `id, libelle`

### Classe : `User`
- **Service Java** : `esprit_D2F-authentification`
- **Hérite de** : `BaseAuditEntity`
- **Attributs diagramme (7)** : `id, username, email, firstName, lastName, disabled, deletedAt`
- **Attributs code source (15)** : `id, username, firstName, lastName, phoneNumber, disabled, discount, hasSubscription, email, password, roles, deviceIds, failedLoginAttempts, lockUntil, deletedAt`
  - ℹ️ **Dans le code Java mais non représenté dans le diagramme** (relations/champs techniques/détails) : `['phoneNumber', 'discount', 'hasSubscription', 'password', 'roles', 'deviceIds', 'failedLoginAttempts', 'lockUntil']`

## 2. CLASSES DU CODE JAVA NON PRÉSENTES DANS LE DIAGRAMME COMPLET

- `AuditLog` (`esprit_D2F-authentification`) : attributs = `['id', 'username', 'action', 'resource', 'status', 'details', 'ipAddress', 'timestamp', 'out"', 'failed"', 'created"', 'updated"', 'deleted"', 'attempt"', 'action']`
- `ConfirmationKey` (`esprit_D2F-authentification`) : attributs = `['id', 'token', 'emailAddress', 'expiresAt']`
- `PersistenceConfig` (`esprit_D2F-besoin-formation`) : attributs = `[]`
- `ReviewerScope` (`esprit_D2F-besoin-formation`) : attributs = `['username', 'role', 'upCode', 'departmentCode']`
- `CompetenceServiceApplication` (`esprit_D2F-competence`) : attributs = `[]`
- `RiceImportLog` (`esprit_D2F-competence`) : attributs = `['id', 'generatedAt', 'domainesCreated', 'competencesCreated', 'sousCompetencesCreated', 'savoirsCreated', 'affectationsCreated', 'enseignantsCovered', 'message', 'tauxJson']`
- `FormationFeedback` (`esprit_D2F-evaluation`) : attributs = `['id', 'formationId', 'enseignantId', 'participantEmail', 'up', 'aspectOrganisationnel', 'aspectTechnique', 'aspectPedagogique', 'besoinComplementaire', 'autresInformations', 'autresBesoins', 'createdAt']`
- `EmailAuditLog` (`esprit_D2F-formation`) : attributs = `['id', 'formationId', 'recipientEmail', 'emailType', 'sentAt', 'success', 'errorMessage']`
- `FormationAnimator` (`esprit_D2F-formation`) : attributs = `['id', 'formationId', 'teacherId', 'animateurId', 'role', 'assignedBy', 'assignedAt', 'status', 'proposalId', 'deletedAt']`
- `FormationAnimatorProposal` (`esprit_D2F-formation`) : attributs = `['id', 'formationId', 'proposerId', 'proposerType', 'proposalType', 'role', 'status', 'motivation', 'proposedBy', 'proposedAt', 'respondedAt', 'validatedBy', 'validatedAt', 'rejectionReason', 'responseComment', 'calendarEventId', 'deletedAt']`
- `FormationParticipantEmail` (`esprit_D2F-formation`) : attributs = `['id', 'formationId', 'email', 'matchedEnseignant', 'createdAt']`
- `ImportLog` (`esprit_D2F-formation`) : attributs = `['id', 'fileName', 'fileSizeBytes', 'fileHash', 'importedBy', 'importedAt', 'formationsCreated', 'sessionsCreated', 'participantsImported', 'rowsSkipped', 'conflictsDetected', 'status']`
- `ReminderSentLog` (`esprit_D2F-formation`) : attributs = `['id', 'seanceId', 'recipientEmail', 'reminderType', 'sentAt']`
- `RoomConflictLog` (`esprit_D2F-formation`) : attributs = `['id', 'conflictType', 'salle', 'dateSeance', 'heureDebut', 'heureFin', 'seanceId', 'otherSeanceId', 'detail', 'detectedAt', 'importLogId']`
- `SeanceCalendarEvent` (`esprit_D2F-formation`) : attributs = `['id', 'seanceId', 'email', 'eventId', 'createdAt']`