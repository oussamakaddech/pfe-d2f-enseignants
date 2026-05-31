package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.email.EmailTemplateBuilder;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookEventParameters;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationPublisher;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static java.util.stream.Collectors.toList;

import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FormationWorkflowService {
    private final DocumentRepository documentRepository;
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceFormationRepository;
    private final EnseignantRepository enseignantRepository;
    private final PresenceRepository presenceRepository;
    private final DeptRepository departementRepository;
    private final UpRepository upRepository;
    private final EvaluationPublisher evaluationPublisher;
    // DSI §4/§2 — injection optionnelle : null si azure.ad.enabled=false
    private final OutlookCalendarService outlookCalendarService;
    private final OutlookMailService outlookMailService;
    private final FormationWorkflowServiceHelper helper;
    private final FormationMapper formationMapper;

    public FormationWorkflowService(DocumentRepository documentRepository,
            FormationRepository formationRepository,
            SeanceFormationRepository seanceFormationRepository,
            EnseignantRepository enseignantRepository,
            PresenceRepository presenceRepository,
            DeptRepository departementRepository,
            UpRepository upRepository,
            EvaluationPublisher evaluationPublisher,
            FormationWorkflowServiceHelper helper,
            FormationMapper formationMapper,
            @org.springframework.lang.Nullable OutlookCalendarService outlookCalendarService,
            @org.springframework.lang.Nullable OutlookMailService outlookMailService) {
        this.documentRepository = documentRepository;
        this.formationRepository = formationRepository;
        this.seanceFormationRepository = seanceFormationRepository;
        this.enseignantRepository = enseignantRepository;
        this.presenceRepository = presenceRepository;
        this.departementRepository = departementRepository;
        this.upRepository = upRepository;
        this.evaluationPublisher = evaluationPublisher;
        this.helper = helper;
        this.formationMapper = formationMapper;
        this.outlookCalendarService = outlookCalendarService;
        this.outlookMailService = outlookMailService;
    }

    private static final String ORGANIZER_EMAIL = "Application.Formationdesformateurs@Esprit.tn";
    private static final String APPROVAL_ACCENT_COLOR = "#1565c0";
    private static final String CANCELLATION_ACCENT_COLOR = "#c62828";
    private static final String DETAIL_TITLE = "Titre";
    private static final String DETAIL_DOMAIN = "Domaine";
    private static final String DETAIL_PERIOD = "Période";
    private static final String DETAIL_FORMATION = "Formation";

    private Time parseTime(String heure) {
        return helper.parseTime(heure);
    }

    private OffsetDateTime convertToOffsetDateTime(java.util.Date dateUtil, java.sql.Time time) {
        return helper.convertToOffsetDateTime(dateUtil, time);
    }

    private void ensureNoConflict(
            String userId,
            Date date,
            Time debut,
            Time fin,
            boolean isAnimateur,
            Long ignoreSeanceId,
            Long ignoreFormationId) {
        helper.ensureNoConflict(userId, date, debut, fin, isAnimateur, ignoreSeanceId, ignoreFormationId);
    }

    @Transactional
    public Formation createFormationWorkflow(FormationWorkflowRequest request) {
        List<String> partIds = Optional.ofNullable(request.getParticipantsIds()).orElse(Collections.emptyList());
        List<FormationWorkflowRequest.SeanceRequest> seanceReqs = Optional.ofNullable(request.getSeances())
                .orElse(Collections.emptyList());

        Formation formation = new Formation();
        helper.initFormationFromRequest(formation, request);
        formation = formationRepository.save(formation);

        List<SeanceFormation> seances = helper.createSeancesForFormation(formation, seanceReqs, partIds);
        seanceFormationRepository.saveAll(seances);

        List<Presence> allPresences = helper.createPresencesForSeances(seances);
        presenceRepository.saveAll(allPresences);

        List<EvaluationFormateurDTO> evaluationDTOs = helper.createEvaluationDTOs(seances, formation);
        publishEvaluationBatch(formation.getIdFormation(), evaluationDTOs);

        formation.setSeances(seances);

        // Notification automatique selon l'état (ENREGISTRE par défaut)
        handleEtatTransitions(formation, null);

        return formationRepository.save(formation);
    }

    private void publishEvaluationBatch(Long formationId, List<EvaluationFormateurDTO> dtos) {
        try {
            evaluationPublisher.sendCreate(
                    new EvaluationBatchMessage(
                            formationId,
                            dtos.stream()
                                    .map(dto -> new EvaluationBatchMessage.EvaluationItem(
                                            dto.getEnseignantId(),
                                            dto.getNote(),
                                            dto.isSatisfaisant(),
                                            dto.getCommentaire()))
                                    .toList()));
        } catch (Exception ex) {
            log.warn("Impossible d'envoyer le message d'evaluation au broker: {}", ex.getMessage());
        }
    }

    @Transactional
    public Formation updateFormationWorkflow(Long formationId, FormationWorkflowRequest request) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalStateException("Formation introuvable"));

        EtatFormation oldEtat = formation.getEtatFormation();
        updateFormationBasicFields(formation, request);
        updateFormationRelations(formation, request);

        Map<String, Enseignant> enseignantMap = loadEnseignantsMap(request);
        List<SeanceFormation> managedList = prepareManagedSeancesList(formation);

        processSeanceRequests(formation, request, enseignantMap, managedList);
        handleEtatTransitions(formation, oldEtat);
        syncPresencesForSeances(managedList, request.getParticipantsIds());
        publishEvaluationUpdatesIfPossible(formationId, request.getParticipantsIds());

        return formationRepository.save(formation);
    }

    private void updateFormationBasicFields(Formation formation, FormationWorkflowRequest request) {
        formation.setTitreFormation(request.getTitreFormation());
        formation.setDateDebut(request.getDateDebut());
        formation.setDateFin(request.getDateFin());
        formation.setTypeFormation(request.getTypeFormation());
        formation.setExterneFormateurNom(request.getExterneFormateurNom());
        formation.setExterneFormateurPrenom(request.getExterneFormateurPrenom());
        formation.setExterneFormateurEmail(request.getExterneFormateurEmail());
        formation.setEtatFormation(request.getEtatFormation());
        formation.setCoutFormation(request.getCoutFormation());
        formation.setOrganismeRefExterne(request.getOrganismeRefExterne());
        formation.setBureauFormationNom(request.getBureauFormationNom());
        formation.setBureauFormationMail(request.getBureauFormationMail());
        formation.setBureauFormationTelephone(request.getBureauFormationTelephone());
        formation.setChargeHoraireGlobal(request.getChargeHoraireGlobal());
        formation.setDomaine(request.getDomaine());
        formation.setCompetence(request.getCompetence());
        formation.setPopulationCible(request.getPopulationCible());
        formation.setObjectifs(request.getObjectifs());
        formation.setObjectifsPedago(request.getObjectifsPedago());
        formation.setEvalMethods(request.getEvalMethods());
        formation.setPrerequis(request.getPrerequis());
        formation.setAcquis(request.getAcquis());
        formation.setIndicateurs(request.getIndicateurs());
        formation.setCoutTransport(request.getCoutTransport());
        formation.setCoutHebergement(request.getCoutHebergement());
        formation.setCoutRepas(request.getCoutRepas());
        formation.setOuverte(request.isOuverte());

        if (request.getPeriodCode() != null) {
            try {
                formation.setPeriodCode(PeriodCode.valueOf(request.getPeriodCode()));
            } catch (Exception e) {
                formation.setPeriodCode(PeriodCode.OTHER);
            }
        }
        formation.setCustomPeriodLabel(request.getCustomPeriodLabel());

        // Mise a jour des animateurs au niveau formation
        if (request.getAnimateursIds() != null) {
            List<Enseignant> animateurs = request.getAnimateursIds().stream()
                    .map(id -> enseignantRepository.findById(id).orElse(null))
                    .filter(Objects::nonNull)
                    .toList();
            formation.setAnimateurs(new ArrayList<>(animateurs));
        }
    }

    private void updateFormationRelations(Formation formation, FormationWorkflowRequest request) {
        if (request.getUpId() != null && !request.getUpId().isBlank()) {
            Up up = upRepository.findById(request.getUpId())
                    .orElseThrow(() -> new IllegalStateException("UP introuvable"));
            formation.setUp(up);
        } else {
            formation.setUp(null);
        }

        if (request.getDepartementId() != null && !request.getDepartementId().isBlank()) {
            Dept dept = departementRepository.findById(request.getDepartementId())
                    .orElseThrow(() -> new IllegalStateException("Departement introuvable"));
            formation.setDepartement(dept);
        } else {
            formation.setDepartement(null);
        }
    }

    private Map<String, Enseignant> loadEnseignantsMap(FormationWorkflowRequest request) {
        List<String> partIds = Optional.ofNullable(request.getParticipantsIds()).orElse(Collections.emptyList());
        List<FormationWorkflowRequest.SeanceRequest> seanceReqs = Optional.ofNullable(request.getSeances())
                .orElse(Collections.emptyList());

        Set<String> allIds = new HashSet<>(partIds);
        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            if (sr.getAnimateursIds() != null) {
                allIds.addAll(sr.getAnimateursIds());
            }
        }

        return enseignantRepository.findAllById(allIds)
                .stream()
                .collect(Collectors.toMap(Enseignant::getId, Function.identity()));
    }

    private List<SeanceFormation> prepareManagedSeancesList(Formation formation) {
        List<SeanceFormation> managedList = formation.getSeances();
        if (managedList == null) {
            managedList = new ArrayList<>();
            formation.setSeances(managedList);
        }
        Hibernate.initialize(managedList);
        if (managedList.isEmpty()) {
            List<SeanceFormation> dbSeances = seanceFormationRepository
                    .findByFormation_IdFormation(formation.getIdFormation());
            if (dbSeances != null && !dbSeances.isEmpty()) {
                managedList.addAll(dbSeances);
            }
        }
        return managedList;
    }

    private void processSeanceRequests(Formation formation, FormationWorkflowRequest request,
            Map<String, Enseignant> enseignantMap, List<SeanceFormation> managedList) {
        List<FormationWorkflowRequest.SeanceRequest> seanceReqs = Optional.ofNullable(request.getSeances())
                .orElse(Collections.emptyList());
        Map<Long, SeanceFormation> existingMap = new HashMap<>();
        for (SeanceFormation sf : new ArrayList<>(managedList)) {
            existingMap.put(sf.getIdSeance(), sf);
        }

        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            boolean isNew = sr.getIdSeance() == null;
            SeanceFormation sf = isNew ? new SeanceFormation() : existingMap.remove(sr.getIdSeance());
            if (sf == null)
                throw new IllegalStateException("Seance inconnue : " + sr.getIdSeance());
            if (isNew)
                sf.setFormation(formation);

            updateSeanceDetails(sf, sr, isNew);
            assignParticipantsToSeance(sf, sr, request.getParticipantsIds(), enseignantMap, isNew,
                    formation.getIdFormation());

            if (isNew)
                managedList.add(sf);
        }

        for (SeanceFormation orphan : existingMap.values()) {
            removeSeanceFromCalendar(orphan);
            managedList.remove(orphan);
        }
    }

    private void updateSeanceDetails(SeanceFormation sf, FormationWorkflowRequest.SeanceRequest sr, boolean isNew) {
        sf.setDateSeance(sr.getDateSeance());
        Time hd = parseTime(sr.getHeureDebut());
        Time hf = parseTime(sr.getHeureFin());
        sf.setHeureDebut(hd);
        sf.setHeureFin(hf);
        sf.setSalle(sr.getSalle());

        if (sr.getSalle() != null && !sr.getSalle().isBlank()) {
            boolean conflict = isNew
                    ? seanceFormationRepository.existsSalleConflict(sr.getSalle(), sr.getDateSeance(), hd, hf)
                    : seanceFormationRepository.existsSalleConflictIgnoringSelf(sr.getSalle(), sr.getDateSeance(), hd,
                            hf, sr.getIdSeance());
            if (conflict) {
                throw new IllegalStateException(
                        "Conflit de salle pour la seance salle " + sr.getSalle() + " le " + sr.getDateSeance());
            }
        }
        sf.setTypeSeance(sr.getTypeSeance());
        sf.setContenus(sr.getContenus());
        sf.setMethodes(sr.getMethodes());
        sf.setDureeTheorique(sr.getDureeTheorique());
        sf.setDureePratique(sr.getDureePratique());
    }

    private void assignParticipantsToSeance(SeanceFormation sf, FormationWorkflowRequest.SeanceRequest sr,
            List<String> partIds, Map<String, Enseignant> enseignantMap, boolean isNew, Long formationId) {
        List<String> seanceAnimIds = Optional.ofNullable(sr.getAnimateursIds()).orElse(Collections.emptyList());
        if (partIds == null)
            partIds = Collections.emptyList();
        Time hd = sf.getHeureDebut();
        Time hf = sf.getHeureFin();
        Long ignoreId = isNew ? null : sr.getIdSeance();

        for (String aid : seanceAnimIds)
            ensureNoConflict(aid, sr.getDateSeance(), hd, hf, true, ignoreId, formationId);
        for (String pid : partIds)
            ensureNoConflict(pid, sr.getDateSeance(), hd, hf, false, ignoreId, formationId);

        sf.setAnimateurs(new ArrayList<>(seanceAnimIds.stream().map(enseignantMap::get)
            .filter(Objects::nonNull)
            .toList()));
        sf.setParticipants(new ArrayList<>(partIds.stream().map(enseignantMap::get)
            .filter(Objects::nonNull)
            .toList()));
    }

    public void handleEtatTransitions(Formation formation, EtatFormation oldEtat) {
        EtatFormation newEtat = formation.getEtatFormation();
        if (newEtat == oldEtat) return;

        log.info("Transition d'etat de la formation {} : {} -> {}", formation.getIdFormation(), oldEtat, newEtat);

        try {
            switch (newEtat) {
                case ENREGISTRE -> notifyEnregistrement(formation);
                case PLANIFIE -> notifyPlanification(formation);
                case VISIBLE -> notifyVisibilite(formation);
                case EN_COURS -> notifyEnCours(formation);
                case ACHEVE -> notifyAcheve(formation);
                case ANNULE -> notifyAnnulation(formation);
                default -> log.debug("Aucune notification configuree pour l'etat {}", newEtat);
            }
        } catch (Exception ex) {
            log.error("Erreur lors de la transition d'etat ({} -> {}) pour la formation {} : {}",
                    oldEtat, newEtat, formation.getIdFormation(), ex.getMessage());
        }
    }

    // ── ENREGISTRE : Notification admin + CUPs qu'une formation est enregistrée ──
    private void notifyEnregistrement(Formation formation) {
        // Notification admin (boîte applicative D2F)
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService != null) {
            try {
                String subject = "[D2F] Nouvelle formation enregistrée : " + formation.getTitreFormation();
                String html = buildStateHtml(formation, "Nouvelle formation enregistrée", "📝",
                        "Une nouvelle formation vient d'être enregistrée et attend d'être planifiée. "
                                + "Vous trouverez ci-dessous le récapitulatif.",
                    APPROVAL_ACCENT_COLOR, null, null);
                outlookMailService.sendMail(ORGANIZER_EMAIL, subject, html);
            } catch (Exception ex) {
                log.warn("Echec notification admin enregistrement : {}", ex.getMessage());
            }
        } else {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — notification admin enregistrement ignorée.");
        }

        // Notification CUPs pour planifier
        notifyCUPOfNewFormation(formation);
    }

    // ── PLANIFIE : Création événements calendrier + notification participants ──
    private void notifyPlanification(Formation formation) {
        // Synchroniser le calendrier Outlook (crée les événements + réunions Teams)
        synchronizeFormationCalendar(formation);

        // Notification aux animateurs et participants
        sendStateNotification(formation,
                "[D2F] Formation planifiée : " + formation.getTitreFormation(),
                "Formation planifiée", "📅",
                "Votre formation a été planifiée. Les séances ci-dessous ont été ajoutées à votre calendrier Outlook ; "
                        + "vous recevrez l'invitation et le lien Teams pour chaque séance.",
                "#e65100",
                "Merci de vérifier que les créneaux sont compatibles avec votre emploi du temps.");
    }

    // ── VISIBLE : Notification que la formation est visible/publiée ──
    private void notifyVisibilite(Formation formation) {
        // Notification aux enseignants concernés
        notifyTeachersOfApprovedFormation(formation);
        // Notification aux CUPs
        notifyCUPOfApprovedFormation(formation);
        // Notification admin (boîte applicative D2F)
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService != null) {
            try {
                String subject = "[D2F] Formation publiée : " + formation.getTitreFormation();
                String html = buildStateHtml(formation, "Formation publiée", "🚀",
                        "La formation est désormais visible et ouverte aux inscriptions.",
                    "#1b5e20", null, null);
                outlookMailService.sendMail(ORGANIZER_EMAIL, subject, html);
            } catch (Exception ex) {
                log.warn("Echec notification admin visibilite : {}", ex.getMessage());
            }
        } else {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — notification admin visibilité ignorée.");
        }
    }

    // ── EN_COURS : Notification que la formation a démarré ──
    private void notifyEnCours(Formation formation) {
        sendStateNotification(formation,
                "[D2F] Formation en cours : " + formation.getTitreFormation(),
                "Formation en cours", "▶️",
                "La formation a démarré. Bonne session à toutes et à tous !",
                "#6a1b9a",
                "Merci de confirmer votre présence à chaque séance directement dans la plateforme D2F.");
    }

    // ── ACHEVE : Notification de fin de formation + demande évaluation ──
    private void notifyAcheve(Formation formation) {
        sendStateNotification(formation,
                "[D2F] Formation achevée : " + formation.getTitreFormation(),
                "Formation achevée", "🎓",
                "La formation est désormais terminée. Merci d'y avoir participé.",
                "#00695c",
                "Dernière étape : merci de <strong>remplir l'évaluation</strong> et de vérifier que les présences "
                        + "ont bien été confirmées dans D2F.");
    }

    // ── ANNULE : Notification d'annulation + suppression calendrier ──
    private void notifyAnnulation(Formation formation) {
        log.info("Notification d'annulation pour la formation {} - envoi emails aux concernes", formation.getIdFormation());

        // 1. Envoyer l'email d'annulation a tous les concernes
        sendStateNotification(formation,
                "[D2F] Annulation de formation : " + formation.getTitreFormation(),
                "Formation annulée", "❌",
                "Nous vous informons que la formation ci-dessous a été <strong>annulée</strong>. "
                        + "Les séances correspondantes seront retirées de votre calendrier.",
            CANCELLATION_ACCENT_COLOR,
                "Aucune action n'est requise de votre part. Nous restons à votre disposition pour toute question.");

        // 2. Supprimer les evenements Outlook calendar
        try {
            removeFormationCalendarEvents(formation);
        } catch (Exception ex) {
            log.error("Erreur lors de la suppression des evenements calendrier pour la formation {} : {}",
                    formation.getIdFormation(), ex.getMessage());
        }
    }

    // ── Notification CUP d'une nouvelle formation à planifier ──
    private void notifyCUPOfNewFormation(Formation formation) {
        if (outlookMailService == null) return;
        if (formation.getUp() == null) return;
        List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
        String subject = "[D2F] Formation à planifier : " + formation.getTitreFormation();
        for (Enseignant cup : cups) {
            if (cup.getMail() == null || cup.getMail().isBlank()) continue;
            try {
                String html = baseFormationEmailBuilder(APPROVAL_ACCENT_COLOR, "⚙️",
                    "Action requise — planification",
                    "Une nouvelle formation a été enregistrée pour votre unité pédagogique "
                        + "et requiert votre intervention.", formation)
                        .greetingName(fullName(cup))
                        .detail("UP", formation.getUp().getLibelle())
                        .note("📌 <strong>Action requise :</strong> merci de procéder à la planification des "
                                + "séances de cette formation depuis la plateforme D2F.")
                        .build();
                outlookMailService.sendMail(cup.getMail(), subject, html);
            } catch (Exception ex) {
                log.warn("Echec notification CUP : {}", ex.getMessage());
            }
        }
    }

    // ── Collecter tous les emails des personnes concernées par une formation ──
    @SuppressWarnings("java:S3776") // aggregates 5 distinct relation sets (animators, formateurs, participants, CUP, departement heads)
    private Set<String> collectAllRecipientEmails(Formation formation) {
        Set<String> emails = new HashSet<>();

        // 1. Animateurs au niveau de la formation
        if (formation.getAnimateurs() != null) {
            Hibernate.initialize(formation.getAnimateurs());
            formation.getAnimateurs().stream()
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .forEach(emails::add);
            log.debug("Formation {} : {} animateurs", formation.getIdFormation(), formation.getAnimateurs().size());
        }

        // 2. Animateurs et participants au niveau des seances
        if (formation.getSeances() != null) {
            log.debug("collectAllRecipientEmails: {} seances pour la formation {}",
                    formation.getSeances().size(), formation.getIdFormation());
            for (SeanceFormation seance : formation.getSeances()) {
                if (seance.getAnimateurs() != null) Hibernate.initialize(seance.getAnimateurs());
                if (seance.getParticipants() != null) Hibernate.initialize(seance.getParticipants());

                if (seance.getAnimateurs() != null) {
                    seance.getAnimateurs().stream()
                            .map(Enseignant::getMail)
                            .filter(m -> m != null && !m.isBlank())
                            .forEach(emails::add);
                }
                if (seance.getParticipants() != null) {
                    seance.getParticipants().stream()
                            .map(Enseignant::getMail)
                            .filter(m -> m != null && !m.isBlank())
                            .forEach(emails::add);
                }
            }
        } else {
            log.warn("collectAllRecipientEmails: aucune seance pour la formation {}", formation.getIdFormation());
        }
        if (formation.getExterneFormateurEmail() != null
                && !formation.getExterneFormateurEmail().isBlank()) {
            emails.add(formation.getExterneFormateurEmail());
        }
        emails.add(ORGANIZER_EMAIL);
        log.info("collectAllRecipientEmails: {} destinataires collectes pour la formation {}",
                emails.size(), formation.getIdFormation());
        return emails;
    }

    // ── Envoyer une notification d'état à tous les concernés, personnalisée par destinataire ──
    private void sendStateNotification(Formation formation, String subject, String title, String icon,
            String intro, String accentColor, String note) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService == null) {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — notification « {} » ignorée.", subject);
            return;
        }
        Set<String> emails = collectAllRecipientEmails(formation);
        Map<String, String> nameByEmail = buildNameByEmail(formation);
        log.info("sendStateNotification: envoi a {} destinataires, sujet={}", emails.size(), subject);
        int successCount = 0;
        int failCount = 0;
        for (String email : emails) {
            try {
                String html = buildStateHtml(formation, title, icon, intro, accentColor, note, nameByEmail.get(email));
                outlookMailService.sendMail(email, subject, html);
                successCount++;
            } catch (Exception ex) {
                failCount++;
                log.warn("Echec envoi email : {}", ex.getMessage());
            }
        }
        log.info("sendStateNotification: termine - {} succes, {} echecs sur {} destinataires",
                successCount, failCount, emails.size());
    }

    // ── Indexe le nom complet des enseignants concernés par adresse e-mail (pour personnaliser l'accroche) ──
    private Map<String, String> buildNameByEmail(Formation formation) {
        Map<String, String> map = new HashMap<>();
        if (formation.getAnimateurs() != null) {
            formation.getAnimateurs().forEach(e -> indexName(map, e));
        }
        if (formation.getSeances() != null) {
            for (SeanceFormation seance : formation.getSeances()) {
                if (seance.getAnimateurs() != null) seance.getAnimateurs().forEach(e -> indexName(map, e));
                if (seance.getParticipants() != null) seance.getParticipants().forEach(e -> indexName(map, e));
            }
        }
        if (formation.getExterneFormateurEmail() != null && !formation.getExterneFormateurEmail().isBlank()
                && formation.getExterneFormateurNom() != null) {
            String externe = (formation.getExterneFormateurPrenom() != null ? formation.getExterneFormateurPrenom() + " " : "")
                    + formation.getExterneFormateurNom();
            map.putIfAbsent(formation.getExterneFormateurEmail(), externe.trim());
        }
        return map;
    }

    private void indexName(Map<String, String> map, Enseignant e) {
        if (e != null && e.getMail() != null && !e.getMail().isBlank()) {
            map.putIfAbsent(e.getMail(), fullName(e));
        }
    }

    private String fullName(Enseignant e) {
        if (e == null) return null;
        String prenom = e.getPrenom() != null ? e.getPrenom() : "";
        String nom = e.getNom() != null ? e.getNom() : "";
        String full = (prenom + " " + nom).trim();
        return full.isBlank() ? null : full;
    }

    // ── Ligne de séance formatée pour le gabarit d'e-mail ──
    private String seanceLine(SeanceFormation seance) {
        return formatDate(seance.getDateSeance()) + " · "
                + formatTime(seance.getHeureDebut()) + "–" + formatTime(seance.getHeureFin()) + " · Salle "
                + (seance.getSalle() != null && !seance.getSalle().isBlank() ? seance.getSalle() : A_DEFINIR);
    }

    private EmailTemplateBuilder baseFormationEmailBuilder(String accentColor, String icon, String title, String intro,
            Formation formation) {
        return EmailTemplateBuilder.create()
                .accentColor(accentColor)
                .icon(icon)
                .title(title)
                .intro(intro)
                .detail(DETAIL_TITLE, formation.getTitreFormation())
                .detail(DETAIL_DOMAIN, formation.getDomaine())
                .detail(DETAIL_PERIOD, formatDate(formation.getDateDebut()) + " au " + formatDate(formation.getDateFin()));
    }

    private void appendFormationSeances(EmailTemplateBuilder builder, Formation formation) {
        if (formation.getSeances() == null) {
            return;
        }
        for (SeanceFormation seance : formation.getSeances()) {
            builder.seance(seanceLine(seance));
        }
    }

    // ── Gabarit unique (compatible Outlook) pour les notifications de changement d'état ──
    private String buildStateHtml(Formation formation, String title, String icon, String intro,
            String accentColor, String note, String greetingName) {
        EmailTemplateBuilder builder = baseFormationEmailBuilder(accentColor, icon, title, intro, formation)
                .greetingName(greetingName)
                .detail("Type", formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : null);

        String animateurs = buildAnimateursLabel(formation);
        if (!animateurs.isBlank()) {
            builder.detail("Animateurs", animateurs);
        }
        appendFormationSeances(builder, formation);
        if (note != null && !note.isBlank()) {
            builder.note(note);
        }
        return builder.build();
    }

    // ── Liste « Prénom Nom » des animateurs (séances + formateur externe) ──
    private String buildAnimateursLabel(Formation formation) {
        String animateursStr = buildSeanceAnimateursLabel(formation);
        animateursStr = appendExterneFormateur(formation, animateursStr);
        return animateursStr;
    }

    private String buildSeanceAnimateursLabel(Formation formation) {
        if (formation.getSeances() == null) return "";
        return formation.getSeances().stream()
                .flatMap(s -> s.getAnimateurs() != null ? s.getAnimateurs().stream() : java.util.stream.Stream.empty())
                .map(this::formatAnimateurName)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.joining(", "));
    }

    private String formatAnimateurName(Enseignant a) {
        return (a.getPrenom() != null ? a.getPrenom() + " " : "") + (a.getNom() != null ? a.getNom() : "");
    }

    private String appendExterneFormateur(Formation formation, String animateursStr) {
        if (formation.getExterneFormateurNom() == null || formation.getExterneFormateurNom().isBlank()) {
            return animateursStr;
        }
        String separator = animateursStr.isEmpty() ? "" : ", ";
        String externeName = (formation.getExterneFormateurPrenom() != null ? formation.getExterneFormateurPrenom() + " " : "")
                + formation.getExterneFormateurNom();
        return animateursStr + separator + externeName;
    }

    private void syncPresencesForSeances(List<SeanceFormation> seances, List<String> partIds) {
        for (SeanceFormation sf : seances) {
            if (sf.getIdSeance() != null) {
                // Collecter tous les IDs : participants + animateurs de cette seance
                Set<String> allIds = new HashSet<>();
                if (partIds != null) allIds.addAll(partIds);
                if (sf.getAnimateurs() != null) {
                    sf.getAnimateurs().stream()
                            .map(Enseignant::getId)
                            .forEach(allIds::add);
                }
                syncPresencesForSeance(sf, allIds);
            }
        }
    }

    private void publishEvaluationUpdatesIfPossible(Long formationId, List<String> partIds) {
        if (partIds == null || partIds.isEmpty())
            return;
        List<EvaluationBatchMessage.EvaluationItem> items = partIds.stream()
                .map(id -> new EvaluationBatchMessage.EvaluationItem(id, 0f, false, "N/A"))
                .toList();
        try {
            evaluationPublisher.sendUpdate(new EvaluationBatchMessage(formationId, items));
        } catch (Exception ex) {
            log.warn("Impossible d'envoyer le message de mise a jour d'evaluation : {}", ex.getMessage());
        }
    }

    private void syncPresencesForSeance(SeanceFormation sf, Set<String> newEnsIds) {
        List<Presence> oldList = presenceRepository.findBySeanceFormation_IdSeance(sf.getIdSeance());

        // Supprimer les presences des enseignants qui ne sont plus concernes
        for (Presence p : oldList) {
            String ensId = p.getEnseignant() != null ? p.getEnseignant().getId() : null;
            if (!newEnsIds.contains(ensId)) {
                presenceRepository.delete(p);
            }
        }

        // Ajouter les presences manquantes pour les nouveaux enseignants
        for (String id : newEnsIds) {
            boolean exists = oldList.stream()
                    .anyMatch(p -> p.getEnseignant() != null
                            && p.getEnseignant().getId() != null
                            && p.getEnseignant().getId().equals(id));
            if (!exists) {
                Enseignant ens = enseignantRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable : " + id));
                Presence p = new Presence();
                p.setSeanceFormation(sf);
                p.setEnseignant(ens);
                p.setPresent(false);
                p.setCommentaire("Presence a valider");
                presenceRepository.save(p);
            }
        }
    }

    @Transactional
    public void deleteFormationWorkflow(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable avec l'id : " + formationId));
        try {
            removeFormationCalendar(formation);
        } catch (RuntimeException ex) {
            log.error("Erreur lors du nettoyage calendrier/email pour la formation {} : {}",
                    formationId, ex.getMessage());
        }
        formationRepository.delete(formation);
    }

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final String A_DEFINIR = "À définir";

    private String formatDate(java.util.Date date) {
        if (date == null) {
            return A_DEFINIR;
        }
        return date.toInstant().atZone(ZoneId.of(FormationWorkflowServiceHelper.TIMEZONE_TUNIS)).toLocalDate()
                .format(DATE_FMT);
    }

    private String formatTime(java.sql.Time time) {
        if (time == null) {
            return A_DEFINIR;
        }
        return time.toLocalTime().format(TIME_FMT);
    }

    private String buildCalendarEventContent(Formation formation, SeanceFormation seance, String animateursStr) {
        return "<html><body>" +
                "<h3>" + formation.getTitreFormation() + "</h3>" +
                "<p><strong>Date:</strong> " + formatDate(seance.getDateSeance()) + "</p>" +
                "<p><strong>Heure:</strong> " + formatTime(seance.getHeureDebut()) + " - "
                + formatTime(seance.getHeureFin()) + "</p>" +
                "<p><strong>Salle:</strong> " + seance.getSalle() + "</p>" +
                "<p><strong>Animateurs:</strong> " + animateursStr + "</p>" +
                "</body></html>";
    }

    @SuppressWarnings("java:S3776") // mail-template branching by formation kind + audience
    public void notifyTeachersOfApprovedFormation(Formation formation) {
        if (outlookMailService == null) return;
        // Envoyer uniquement aux enseignants concernés (participants + animateurs), pas à tous
        Set<String> recipientIds = new HashSet<>();
        if (formation.getSeances() != null) {
            for (SeanceFormation seance : formation.getSeances()) {
                if (seance.getAnimateurs() != null) {
                    seance.getAnimateurs().forEach(a -> recipientIds.add(a.getId()));
                }
                if (seance.getParticipants() != null) {
                    seance.getParticipants().forEach(p -> recipientIds.add(p.getId()));
                }
            }
        }
        // Recharger les enseignants concernés depuis la base pour éviter les sessions Hibernate fermées
        List<Enseignant> recipients = recipientIds.isEmpty()
                ? Collections.emptyList()
                : enseignantRepository.findAllById(recipientIds);

        String subject = "[D2F] Nouvelle formation disponible : " + formation.getTitreFormation();

        for (Enseignant e : recipients) {
            if (e.getMail() == null || e.getMail().isBlank()) continue;
            try {
                String htmlContent = buildApprovalNotificationHtml(formation, fullName(e));
                outlookMailService.sendMail(e.getMail(), subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de notification pour l'enseignant : {}", ex.getMessage());
            }
        }
    }

    private String buildApprovalNotificationHtml(Formation formation, String greetingName) {
        EmailTemplateBuilder builder = baseFormationEmailBuilder("#1b5e20", "✅", "Nouvelle formation disponible",
            "Une nouvelle formation vient d'être publiée et vous concerne. "
                + "Voici l'essentiel à retenir.", formation)
                .greetingName(greetingName);
        appendFormationSeances(builder, formation);
        return builder.build();
    }

    public void notifyCUPOfApprovedFormation(Formation formation) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService == null) {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — notification CUP formation approuvée ignorée.");
            return;
        }
        if (formation.getUp() == null)
            return;
        List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
        String subject = "[D2F] Formation approuvée : " + formation.getTitreFormation();
        for (Enseignant cup : cups) {
            if (cup.getMail() == null || cup.getMail().isBlank()) continue;
            try {
                String htmlContent = baseFormationEmailBuilder(APPROVAL_ACCENT_COLOR, "✅",
                    "Formation approuvée",
                    "La formation <strong>" + formation.getTitreFormation() + "</strong> a été approuvée "
                        + "et est désormais visible pour les responsables d'unités pédagogiques.", formation)
                        .greetingName(fullName(cup))
                        .detail("UP", formation.getUp().getLibelle())
                        .build();
                outlookMailService.sendMail(cup.getMail(), subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de notification CUP : {}", ex.getMessage());
            }
        }
    }

    public void synchronizeFormationCalendar(Formation formation) {
        Formation freshFormation = formationRepository.findById(formation.getIdFormation())
                .orElseThrow(() -> new IllegalStateException("La formation a ete supprimee."));

        for (SeanceFormation seance : freshFormation.getSeances()) {
            synchronizeSeance(freshFormation, seance);
        }
    }

    private void synchronizeSeance(Formation freshFormation, SeanceFormation seance) {
        SeanceFormation freshSeance = seanceFormationRepository.findById(seance.getIdSeance())
                .orElseThrow(() -> new IllegalStateException("La seance a ete supprimee."));

        OffsetDateTime eventStart = convertToOffsetDateTime(freshSeance.getDateSeance(),
                freshSeance.getHeureDebut());
        OffsetDateTime eventEnd = convertToOffsetDateTime(freshSeance.getDateSeance(), freshSeance.getHeureFin());

        String animateursStr = buildAnimateursString(freshSeance, freshFormation);
        String eventSubject = String.format("[D2F] %s : %s", freshFormation.getTitreFormation(), animateursStr);
        String eventHtmlContent = buildCalendarEventContent(freshFormation, freshSeance, animateursStr);

        Set<String> emails = buildEmailsSet(freshSeance, freshFormation);

        try {
            createOrUpdateCalendarEvent(freshSeance, eventSubject, eventHtmlContent, eventStart, eventEnd, emails,
                    freshFormation);
        } catch (Exception ex) {
            log.error("Erreur lors de la synchronisation de l'evenement : {}", ex.getMessage());
        }
    }

    private String buildAnimateursString(SeanceFormation freshSeance, Formation freshFormation) {
        String animateursStr = freshSeance.getAnimateurs() == null
            ? ""
            : freshSeance.getAnimateurs().stream()
                .map(e -> e.getNom() + " " + e.getPrenom())
                .collect(Collectors.joining(", "));
        if (freshFormation.getExterneFormateurNom() != null && !freshFormation.getExterneFormateurNom().isBlank()) {
            animateursStr += (animateursStr.isEmpty() ? "" : ", ") + freshFormation.getExterneFormateurNom() + " "
                    + freshFormation.getExterneFormateurPrenom();
        }
        return animateursStr;
    }

    private Set<String> buildEmailsSet(SeanceFormation freshSeance, Formation freshFormation) {
        Set<String> emails = new HashSet<>();
        if (freshSeance.getAnimateurs() != null) {
            freshSeance.getAnimateurs().stream()
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .forEach(emails::add);
        }
        if (freshSeance.getParticipants() != null) {
            freshSeance.getParticipants().stream()
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .forEach(emails::add);
        }
        if (freshFormation.getExterneFormateurEmail() != null
                && !freshFormation.getExterneFormateurEmail().isBlank()) {
            emails.add(freshFormation.getExterneFormateurEmail());
        }
        emails.add(ORGANIZER_EMAIL);
        return emails;
    }

    private void createOrUpdateCalendarEvent(SeanceFormation freshSeance, String eventSubject,
            String eventHtmlContent, OffsetDateTime eventStart, OffsetDateTime eventEnd,
            Set<String> emails, Formation freshFormation) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookCalendarService == null) {
            log.info("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — séance {} sans événement.", freshSeance.getIdSeance());
            return;
        }
        boolean isNewEvent = freshSeance.getCalendarEventId() == null;

        OutlookEventParameters eventParams = OutlookEventParameters.builder()
                .organizerEmail(ORGANIZER_EMAIL)
                .eventId(freshSeance.getCalendarEventId())
                .subject(eventSubject)
                .htmlContent(eventHtmlContent)
                .start(eventStart)
                .end(eventEnd)
                .salle(freshSeance.getSalle())
                .attendeeEmails(new ArrayList<>(emails))
                .build();

        try {
            if (!isNewEvent) {
                OutlookCalendarService.EventCreationResult res = outlookCalendarService
                        .updateEventInCalendarWithTeamsUrl(eventParams);
                freshSeance.setOnlineMeetingUrl(res.getJoinUrl());
                seanceFormationRepository.save(freshSeance);
            } else {
                OutlookCalendarService.EventCreationResult res = outlookCalendarService
                        .addEventToCalendarAndReturnIdWithTeamsUrl(eventParams);
                freshSeance.setCalendarEventId(res.getEventId());
                freshSeance.setOnlineMeetingUrl(res.getJoinUrl());
                seanceFormationRepository.save(freshSeance);
            }
        } catch (Exception ex) {
            log.error("Erreur lors de la creation/mise a jour de l'evenement Outlook pour la seance {} : {}",
                    freshSeance.getIdSeance(), ex.getMessage());
        }

        sendCalendarNotification(emails, isNewEvent, freshFormation);
    }

    @SuppressWarnings("java:S1172")
    private void sendCalendarNotification(Set<String> emails, boolean isNewEvent, Formation freshFormation) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService == null) {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — notification non envoyée pour formation {}.", freshFormation.getIdFormation());
            return;
        }
        // Ne pas envoyer d'email supplémentaire ici :
        // L'événement calendrier Outlook envoie déjà une invitation automatique aux participants,
        // et notifyPlanification() envoie un email de notification complet séparément.
        // Envoyer un 3e email ici causerait un doublon/triplon.
        log.info("[Formation] Notification calendrier ignorée (doublon) pour formation {} — gérée par notifyPlanification.", freshFormation.getIdFormation());
    }

    @SuppressWarnings("java:S3776") // graph API cleanup with multiple try/catch layers — single transactional unit
    public void removeSeanceFromCalendar(SeanceFormation seance) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookCalendarService == null) {
            log.info("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — suppression événement ignorée pour séance {}.", seance.getIdSeance());
            return;
        }
        // Initialiser les collections lazy
        if (seance.getAnimateurs() != null) Hibernate.initialize(seance.getAnimateurs());
        if (seance.getParticipants() != null) Hibernate.initialize(seance.getParticipants());

        if (seance.getCalendarEventId() != null) {
            try {
                outlookCalendarService.deleteEventInCalendar(ORGANIZER_EMAIL, seance.getCalendarEventId());
            } catch (Exception ex) {
                log.error("Erreur lors de la suppression de l'evenement : {}", ex.getMessage());
            }
        }
        try {
            String mailSubject = String.format("[D2F] Annulation de Seance : %s",
                    seance.getFormation().getTitreFormation());
            String htmlContent = buildCancellationSeanceHtml(seance);

            Set<String> emails = new HashSet<>();
            if (seance.getAnimateurs() != null)
                seance.getAnimateurs().stream()
                        .map(Enseignant::getMail)
                        .filter(m -> m != null && !m.isBlank())
                        .forEach(emails::add);
            if (seance.getParticipants() != null)
                seance.getParticipants().stream()
                        .map(Enseignant::getMail)
                        .filter(m -> m != null && !m.isBlank())
                        .forEach(emails::add);

            if (seance.getFormation().getExterneFormateurEmail() != null
                    && !seance.getFormation().getExterneFormateurEmail().isBlank()) {
                emails.add(seance.getFormation().getExterneFormateurEmail());
            }
            emails.add(ORGANIZER_EMAIL);

            sendCancellationEmails(emails, mailSubject, htmlContent);
        } catch (RuntimeException ex) {
            log.error("Erreur lors de l'envoi des mails d'annulation : {}", ex.getMessage());
        }
    }

    private void sendCancellationEmails(Set<String> emails, String mailSubject, String htmlContent) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService == null) {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — {} emails d'annulation non envoyés.", emails.size());
            return;
        }
        for (String email : emails) {
            if (email == null || email.isBlank()) continue;
            try {
                outlookMailService.sendMail(email, mailSubject, htmlContent);
            } catch (RuntimeException mailEx) {
                log.warn("Echec envoi mail d'annulation : {}", mailEx.getMessage());
            }
        }
    }

    private String buildCancellationSeanceHtml(SeanceFormation seance) {
        Formation formation = seance.getFormation();
        return EmailTemplateBuilder.create()
            .accentColor(CANCELLATION_ACCENT_COLOR)
                .icon("❌")
                .title("Annulation de séance")
                .intro("Nous vous informons que la séance ci-dessous a été <strong>annulée</strong>.")
            .detail(DETAIL_FORMATION, formation.getTitreFormation())
                .detail("Date", formatDate(seance.getDateSeance()))
                .detail("Horaire", formatTime(seance.getHeureDebut()) + " – " + formatTime(seance.getHeureFin()))
                .detail("Salle", seance.getSalle() != null && !seance.getSalle().isBlank() ? seance.getSalle() : A_DEFINIR)
                .note("L'événement correspondant a été retiré de votre calendrier Outlook. "
                        + "Aucune action n'est requise de votre part.")
                .build();
    }

    @SuppressWarnings("java:S3776") // graph API cleanup for all seances + notifications + repo updates — single transactional unit
    public void removeFormationCalendar(Formation formation) {
        Formation freshFormation = formationRepository.findById(formation.getIdFormation())
                .orElseThrow(() -> new IllegalStateException("La formation a ete supprimee."));

        // Initialiser les collections lazy avant de les utiliser
        if (freshFormation.getSeances() != null) {
            Hibernate.initialize(freshFormation.getSeances());
            for (SeanceFormation seance : freshFormation.getSeances()) {
                if (seance.getAnimateurs() != null) Hibernate.initialize(seance.getAnimateurs());
                if (seance.getParticipants() != null) Hibernate.initialize(seance.getParticipants());
            }
        }

        // Collecter tous les emails des personnes concernees
        Set<String> allRecipientEmails = new HashSet<>();
        if (freshFormation.getSeances() != null) {
            for (SeanceFormation seance : freshFormation.getSeances()) {
                if (seance.getAnimateurs() != null) {
                    seance.getAnimateurs().stream()
                            .map(Enseignant::getMail)
                            .filter(m -> m != null && !m.isBlank())
                            .forEach(allRecipientEmails::add);
                }
                if (seance.getParticipants() != null) {
                    seance.getParticipants().stream()
                            .map(Enseignant::getMail)
                            .filter(m -> m != null && !m.isBlank())
                            .forEach(allRecipientEmails::add);
                }
            }
        }
        if (freshFormation.getExterneFormateurEmail() != null
                && !freshFormation.getExterneFormateurEmail().isBlank()) {
            allRecipientEmails.add(freshFormation.getExterneFormateurEmail());
        }
        allRecipientEmails.add(ORGANIZER_EMAIL);

        // Envoyer un email global d'annulation a tous les concernes
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService != null) {
            String subject = "[D2F] Annulation de Formation : " + freshFormation.getTitreFormation();
            String htmlContent = buildCancellationFormationHtml(freshFormation);
            for (String email : allRecipientEmails) {
                try {
                    outlookMailService.sendMail(email, subject, htmlContent);
                } catch (Exception ex) {
                    log.warn("Echec envoi mail d'annulation formation : {}", ex.getMessage());
                }
            }
        } else {
            log.info("[Formation] Mail Outlook désactivé (azure.ad.enabled=false) — {} emails d'annulation formation non envoyés.", allRecipientEmails.size());
        }

        // Supprimer les evenements Outlook calendar pour chaque seance
        if (outlookCalendarService != null) {
            for (SeanceFormation seance : freshFormation.getSeances()) {
                if (seance.getCalendarEventId() != null) {
                    try {
                        outlookCalendarService.deleteEventInCalendar(ORGANIZER_EMAIL, seance.getCalendarEventId());
                    } catch (Exception ex) {
                        log.error("Erreur lors de la suppression de l'evenement calendar pour seance {} : {}",
                                seance.getIdSeance(), ex.getMessage());
                    }
                }
            }
        } else {
            log.info("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — suppression des événements calendrier ignorée.");
        }
    }

    /**
     * Supprime uniquement les evenements calendrier Outlook d'une formation (sans envoyer d'emails).
     * Utilise par notifyAnnulation qui gere les emails separement.
     */
    private void removeFormationCalendarEvents(Formation formation) {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookCalendarService == null) {
            log.info("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — suppression des événements calendrier ignorée pour formation {}.", formation.getIdFormation());
            return;
        }
        if (formation.getSeances() == null) return;
        for (SeanceFormation seance : formation.getSeances()) {
            if (seance.getCalendarEventId() != null) {
                try {
                    outlookCalendarService.deleteEventInCalendar(ORGANIZER_EMAIL, seance.getCalendarEventId());
                    log.info("Evenement calendrier supprime pour la seance {} de la formation {}",
                            seance.getIdSeance(), formation.getIdFormation());
                } catch (Exception ex) {
                    log.error("Erreur lors de la suppression de l'evenement calendar pour seance {} : {}",
                            seance.getIdSeance(), ex.getMessage());
                }
            }
        }
    }

    private String buildCancellationFormationHtml(Formation formation) {
        EmailTemplateBuilder builder = baseFormationEmailBuilder(CANCELLATION_ACCENT_COLOR, "❌",
                "Annulation de formation",
                "Nous vous informons que la formation ci-dessous a été <strong>annulée</strong>.", formation)
                .detail("Dates prévues", formatDate(formation.getDateDebut()) + " au " + formatDate(formation.getDateFin()));
        appendFormationSeances(builder, formation);
        builder.note("Les séances ci-dessus sont annulées : merci de ne pas vous y présenter. "
                + "Les événements correspondants ont été retirés de votre calendrier Outlook.");
        return builder.build();
    }

    public FormationResponseDTO getFormationWorkflowById(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable avec l'id : " + formationId));
        if (formation.getSeances() != null) {
            formation.getSeances().forEach(seance -> {
                if (seance.getAnimateurs() != null)
                    Hibernate.initialize(seance.getAnimateurs());
                if (seance.getParticipants() != null)
                    Hibernate.initialize(seance.getParticipants());
            });
        }
        return formationMapper.toResponseDTO(formation);
    }

    @Transactional(readOnly = true)
    public List<FormationResponseDTO> getAllFormationWorkflows() {
        List<Formation> formations = formationRepository.findAll();
        formations.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(seance -> {
                    if (seance.getAnimateurs() != null)
                        Hibernate.initialize(seance.getAnimateurs());
                    if (seance.getParticipants() != null)
                        Hibernate.initialize(seance.getParticipants());
                });
            }
            if (f.getFormationCompetences() != null)
                Hibernate.initialize(f.getFormationCompetences());
            if (f.getInscriptions() != null)
                Hibernate.initialize(f.getInscriptions());
        });
        return formations.stream().map(formationMapper::toResponseDTO).toList();
    }

    @Transactional
    public void updatePresence(Long idParticipation, boolean isPresent, String commentaire) {
        Presence presence = presenceRepository.findById(idParticipation)
                .orElseThrow(() -> new IllegalArgumentException("Presence introuvable pour id " + idParticipation));
        presence.setPresent(isPresent);
        presence.setCommentaire(commentaire);
        presenceRepository.save(presence);
    }

    public EnseignantDTO mapEnseignantToDTO(Enseignant ens) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(ens.getId());
        dto.setNom(ens.getNom());
        dto.setPrenom(ens.getPrenom());
        dto.setMail(ens.getMail());
        dto.setType(ens.getType());
        return dto;
    }

    public SeanceDTO mapSeanceToDTO(SeanceFormation seance) {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(seance.getIdSeance());
        dto.setDateSeance(seance.getDateSeance());
        dto.setHeureDebut(seance.getHeureDebut());
        dto.setHeureFin(seance.getHeureFin());
        dto.setSalle(seance.getSalle());
        dto.setContenus(seance.getContenus());
        dto.setMethodes(seance.getMethodes());
        dto.setTypeSeance(seance.getTypeSeance());
        dto.setDureePratique(seance.getDureePratique());
        dto.setDureeTheorique(seance.getDureeTheorique());

        if (seance.getAnimateurs() != null) {
            dto.setAnimateurs(seance.getAnimateurs().stream().map(this::mapEnseignantToDTO).toList());
        }
        if (seance.getParticipants() != null) {
            dto.setParticipants(seance.getParticipants().stream().map(this::mapEnseignantToDTO).toList());
        }
        return dto;
    }

    public List<FormationResponseDTO> getFormationsByAnimateurEmail(String email) {
        List<Formation> allFormations = formationRepository.findDistinctBySeancesAnimateursMail(email);
        List<Formation> enCours = allFormations.stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.EN_COURS)
                .toList();
        enCours.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(s -> {
                    Hibernate.initialize(s.getAnimateurs());
                    Hibernate.initialize(s.getParticipants());
                });
            }
        });
        return enCours.stream().map(formationMapper::toResponseDTO).toList();
    }

    public List<PresenceDTO> getPresencesBySeance(Long seanceId) {
        SeanceFormation seance = seanceFormationRepository.findById(seanceId)
                .orElseThrow(() -> new IllegalArgumentException("Seance introuvable for id " + seanceId));
        List<Presence> presences = seance.getPresences();
        if (presences == null) {
            return Collections.emptyList();
        }
        return presences.stream().map(this::mapPresenceToDTO).toList();
    }

    @Transactional
    public List<PresenceDTO> batchUpdatePresences(Long seanceId, esprit.pfe.serviceformation.dto.BatchPresenceUpdateRequest request) {
        if (request == null || request.getUpdates() == null || request.getUpdates().isEmpty()) {
            return getPresencesBySeance(seanceId);
        }
        List<Presence> seancePresences = presenceRepository.findBySeanceFormation_IdSeance(seanceId);
        Map<Long, Presence> indexById = new HashMap<>();
        for (Presence p : seancePresences) {
            indexById.put(p.getIdParticipation(), p);
        }
        for (esprit.pfe.serviceformation.dto.BatchPresenceUpdateRequest.Item item : request.getUpdates()) {
            Presence existing = (item == null || item.getIdParticipation() == null)
                    ? null
                    : indexById.get(item.getIdParticipation());
            if (existing == null) {
                continue; // skip null items and presences that don't belong to this seance
            }
            existing.setPresent(item.isPresent());
            if (item.getCommentaire() != null) {
                existing.setCommentaire(item.getCommentaire());
            }
        }
        presenceRepository.saveAll(seancePresences);
        return seancePresences.stream().map(this::mapPresenceToDTO).toList();
    }

    @Transactional
    public List<PresenceDTO> markAllPresences(Long seanceId, boolean present) {
        List<Presence> seancePresences = presenceRepository.findBySeanceFormation_IdSeance(seanceId);
        for (Presence p : seancePresences) {
            p.setPresent(present);
            if (present && (p.getCommentaire() == null || p.getCommentaire().isBlank()
                    || "Presence a valider".equalsIgnoreCase(p.getCommentaire()))) {
                p.setCommentaire("Presence confirmee");
            }
        }
        presenceRepository.saveAll(seancePresences);
        return seancePresences.stream().map(this::mapPresenceToDTO).toList();
    }

    public esprit.pfe.serviceformation.dto.SeancePresenceStatsDTO getSeancePresenceStats(Long seanceId) {
        List<Presence> seancePresences = presenceRepository.findBySeanceFormation_IdSeance(seanceId);
        long total = seancePresences.size();
        long presents = seancePresences.stream().filter(Presence::isPresent).count();
        long absents = total - presents;
        double taux = total == 0 ? 0.0 : presents * 100.0 / total;
        return new esprit.pfe.serviceformation.dto.SeancePresenceStatsDTO(seanceId, total, presents, absents, taux);
    }

    private PresenceDTO mapPresenceToDTO(Presence presence) {
        PresenceDTO dto = new PresenceDTO();
        dto.setIdParticipation(presence.getIdParticipation());
        dto.setPresent(presence.isPresent());
        dto.setCommentaire(presence.getCommentaire());
        if (presence.getEnseignant() != null) {
            dto.setEnseignant(mapEnseignantToDTO(presence.getEnseignant()));
        }
        return dto;
    }

    public List<FormationResponseDTO> getFormationsAchevees() {
        List<Formation> achevees = formationRepository.findByEtatFormation(EtatFormation.ACHEVE);
        return achevees.stream().map(formationMapper::toResponseDTO).toList();
    }

    public List<FormationWithDocumentsDTO> getAllFormationsWithDocuments() {
        List<Formation> formations = formationRepository.findAll();
        return formations.stream().map(formation -> {
            FormationWithDocumentsDTO dto = new FormationWithDocumentsDTO();
            dto.setIdFormation(formation.getIdFormation());
            dto.setTitreFormation(formation.getTitreFormation());
            dto.setTypeFormation(
                    formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : "INTERNE");
            dto.setDateDebut(formation.getDateDebut());
            dto.setDateFin(formation.getDateFin());
            // DTO uses primitive float/int — guard against null entity fields to
            // avoid auto-unboxing NPE on legacy/incomplete rows.
            dto.setEtatFormation(formation.getEtatFormation() != null ? formation.getEtatFormation().toString() : "NOUVEAU");
            dto.setCoutFormation(formation.getCoutFormation() != null ? formation.getCoutFormation() : 0f);
            dto.setOrganismeRefExterne(formation.getOrganismeRefExterne());
            dto.setChargeHoraireGlobal(formation.getChargeHoraireGlobal() != null ? formation.getChargeHoraireGlobal().intValue() : 0);
            dto.setPeriodCode(formation.getPeriodCode() != null ? formation.getPeriodCode().name() : null);
            dto.setCustomPeriodLabel(formation.getCustomPeriodLabel());

            if (formation.getDepartement() != null) {
                DeptDTO deptDTO = new DeptDTO();
                deptDTO.setId(formation.getDepartement().getId());
                deptDTO.setLibelle(formation.getDepartement().getLibelle());
                dto.setDepartement1(deptDTO);
            }

            if (formation.getUp() != null) {
                UpDTO upDTO = new UpDTO();
                upDTO.setId(formation.getUp().getId());
                upDTO.setLibelle(formation.getUp().getLibelle());
                dto.setUp1(upDTO);
            }

            List<Document> documents = documentRepository.findByFormation_IdFormation(formation.getIdFormation());
            List<DocumentDTO> documentDTOs = documents.stream()
                    .map(DocumentMapper::mapToDTO)
                    .toList();
            dto.setDocuments(documentDTOs);

            return dto;
        }).toList();
    }

    public FormationsByRoleDTO getFormationsForCalendar(String enseignantId) {
        List<FormationResponseDTO> animateur = formationRepository
                .findDistinctBySeances_Animateurs_Id(enseignantId)
                .stream().map(formationMapper::toResponseDTO).toList();

        List<FormationResponseDTO> participant = formationRepository
                .findDistinctBySeances_Participants_Id(enseignantId)
                .stream().map(formationMapper::toResponseDTO).toList();

        return new FormationsByRoleDTO(animateur, participant);
    }

    @Transactional
    public FormationResponseDTO setInscriptionsOuvertes(Long formationId, boolean ouvert) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));
        formation.setInscriptionsOuvertes(ouvert);
        Formation saved = formationRepository.save(formation);
        return formationMapper.toResponseDTO(saved);
    }

    public List<FormationResponseDTO> getFormationsVisibles() {
        return formationRepository.findAll().stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.VISIBLE
                        || f.getEtatFormation() == EtatFormation.PLANIFIE
                        || f.getEtatFormation() == EtatFormation.EN_COURS
                        || f.isInscriptionsOuvertes())
                .map(formationMapper::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FormationResponseDTO> getFormationsParUp(String upId) {
        List<Formation> formations = formationRepository.findByUp_Id(upId);
        formations.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(seance -> {
                    if (seance.getAnimateurs() != null)
                        Hibernate.initialize(seance.getAnimateurs());
                    if (seance.getParticipants() != null)
                        Hibernate.initialize(seance.getParticipants());
                });
            }
            if (f.getFormationCompetences() != null)
                Hibernate.initialize(f.getFormationCompetences());
            if (f.getInscriptions() != null)
                Hibernate.initialize(f.getInscriptions());
        });
        return formations.stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.VISIBLE
                        || f.getEtatFormation() == EtatFormation.PLANIFIE
                        || f.getEtatFormation() == EtatFormation.EN_COURS
                        || f.isInscriptionsOuvertes())
                .map(formationMapper::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FormationResponseDTO> getFormationsParDepartement(String deptId) {
        List<Formation> formations = formationRepository.findByDepartement_Id(deptId);
        formations.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(seance -> {
                    if (seance.getAnimateurs() != null)
                        Hibernate.initialize(seance.getAnimateurs());
                    if (seance.getParticipants() != null)
                        Hibernate.initialize(seance.getParticipants());
                });
            }
            if (f.getFormationCompetences() != null)
                Hibernate.initialize(f.getFormationCompetences());
            if (f.getInscriptions() != null)
                Hibernate.initialize(f.getInscriptions());
        });
        return formations.stream().map(formationMapper::toResponseDTO).toList();
    }
}
