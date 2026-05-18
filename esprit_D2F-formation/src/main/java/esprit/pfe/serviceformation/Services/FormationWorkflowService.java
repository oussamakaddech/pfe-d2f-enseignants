package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
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
    private final OutlookCalendarService outlookCalendarService;
    private final OutlookMailService outlookMailService;
    private final FormationWorkflowServiceHelper helper;

    public FormationWorkflowService(DocumentRepository documentRepository,
            FormationRepository formationRepository,
            SeanceFormationRepository seanceFormationRepository,
            EnseignantRepository enseignantRepository,
            PresenceRepository presenceRepository,
            DeptRepository departementRepository,
            UpRepository upRepository,
            EvaluationPublisher evaluationPublisher,
            OutlookCalendarService outlookCalendarService,
            OutlookMailService outlookMailService,
            FormationWorkflowServiceHelper helper) {
        this.documentRepository = documentRepository;
        this.formationRepository = formationRepository;
        this.seanceFormationRepository = seanceFormationRepository;
        this.enseignantRepository = enseignantRepository;
        this.presenceRepository = presenceRepository;
        this.departementRepository = departementRepository;
        this.upRepository = upRepository;
        this.evaluationPublisher = evaluationPublisher;
        this.outlookCalendarService = outlookCalendarService;
        this.outlookMailService = outlookMailService;
        this.helper = helper;
    }

    private static final String ORGANIZER_EMAIL = "Application.Formationdesformateurs@Esprit.tn";

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
        formation.setChargeHoraireGlobal(request.getChargeHoraireGlobal());
        formation.setDomaine(request.getDomaine());
        formation.setCompetance(request.getCompetance());
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
            formation.setAnimateurs(animateurs);
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

        sf.setAnimateurs(seanceAnimIds.stream().map(enseignantMap::get).filter(Objects::nonNull).toList());
        sf.setParticipants(partIds.stream().map(enseignantMap::get).filter(Objects::nonNull).toList());
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
        // Notification admin
        try {
            String subject = "[D2F] Nouvelle Formation Enregistree : " + formation.getTitreFormation();
            String html = buildStateNotificationHtml(formation, "Nouvelle Formation Enregistree",
                    "Une nouvelle formation a ete enregistree et est en attente de planification.",
                    "#1565c0");
            outlookMailService.sendMail(ORGANIZER_EMAIL, subject, html);
        } catch (Exception ex) {
            log.warn("Echec notification admin enregistrement : {}", ex.getMessage());
        }

        // Notification CUPs pour planifier
        notifyCUPOfNewFormation(formation);
    }

    // ── PLANIFIE : Création événements calendrier + notification participants ──
    private void notifyPlanification(Formation formation) {
        // Synchroniser le calendrier Outlook (crée les événements + réunions Teams)
        synchronizeFormationCalendar(formation);

        // Notification aux animateurs et participants
        Set<String> recipientEmails = collectAllRecipientEmails(formation);
        String subject = "[D2F] Formation Planifiee : " + formation.getTitreFormation();
        String html = buildStateNotificationHtml(formation, "Formation Planifiee",
                "La formation a ete planifiee. Les evenements ont ete ajoutes a votre calendrier Outlook.",
                "#e65100");
        sendEmailsSafely(recipientEmails, subject, html);
    }

    // ── VISIBLE : Notification que la formation est visible/publiée ──
    private void notifyVisibilite(Formation formation) {
        // Notification aux enseignants concernés
        notifyTeachersOfApprovedFormation(formation);
        // Notification aux CUPs
        notifyCUPOfApprovedFormation(formation);
        // Notification admin
        try {
            String subject = "[D2F] Formation Publiee : " + formation.getTitreFormation();
            String html = buildStateNotificationHtml(formation, "Formation Publiee",
                    "La formation est maintenant visible et ouverte aux inscriptions.",
                    "#1b5e20");
            outlookMailService.sendMail(ORGANIZER_EMAIL, subject, html);
        } catch (Exception ex) {
            log.warn("Echec notification admin visibilite : {}", ex.getMessage());
        }
    }

    // ── EN_COURS : Notification que la formation a démarré ──
    private void notifyEnCours(Formation formation) {
        Set<String> recipientEmails = collectAllRecipientEmails(formation);
        String subject = "[D2F] Formation En Cours : " + formation.getTitreFormation();
        String html = buildStateNotificationHtml(formation, "Formation En Cours",
                "La formation a demarre. Merci de confirmer votre presence a chaque seance.",
                "#6a1b9a");
        sendEmailsSafely(recipientEmails, subject, html);
    }

    // ── ACHEVE : Notification de fin de formation + demande évaluation ──
    private void notifyAcheve(Formation formation) {
        Set<String> recipientEmails = collectAllRecipientEmails(formation);
        String subject = "[D2F] Formation Achevee : " + formation.getTitreFormation();
        String html = buildStateNotificationHtml(formation, "Formation Achevee",
                "La formation est terminee. Merci de remplir les evaluations et de confirmer les presences.",
                "#00695c");
        sendEmailsSafely(recipientEmails, subject, html);
    }

    // ── ANNULE : Notification d'annulation + suppression calendrier ──
    private void notifyAnnulation(Formation formation) {
        log.info("Notification d'annulation pour la formation {} - envoi emails aux concernes", formation.getIdFormation());

        // 1. Collecter les emails AVANT de recharger depuis la DB
        Set<String> recipientEmails = collectAllRecipientEmails(formation);
        log.info("Destinataires email annulation : {}", recipientEmails);

        // 2. Envoyer l'email d'annulation a tous les concernes
        String subject = "[D2F] Annulation de Formation : " + formation.getTitreFormation();
        String html = buildStateNotificationHtml(formation, "Annulation de Formation",
                "La formation suivante a ete <strong>annulee</strong>. Les seances sont supprimees du calendrier.",
                "#c62828");
        sendEmailsSafely(recipientEmails, subject, html);

        // 3. Supprimer les evenements Outlook calendar
        try {
            removeFormationCalendarEvents(formation);
        } catch (Exception ex) {
            log.error("Erreur lors de la suppression des evenements calendrier pour la formation {} : {}",
                    formation.getIdFormation(), ex.getMessage());
        }
    }

    // ── Notification CUP d'une nouvelle formation à planifier ──
    private void notifyCUPOfNewFormation(Formation formation) {
        if (formation.getUp() == null) return;
        List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
        String subject = "[D2F] Formation a planifier : " + formation.getTitreFormation();
        for (Enseignant cup : cups) {
            if (cup.getMail() == null || cup.getMail().isBlank()) continue;
            try {
                String html = String.format(
                        "<!DOCTYPE html><html><head><style>" +
                        "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                        ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                        ".header { background-color: #1565c0; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                        ".content { padding: 20px; }" +
                        ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                        "strong { color: #1565c0; }" +
                        "</style></head><body>" +
                        "<div class='container'>" +
                        "<div class='header'><h2>Action Requise : Planification</h2></div>" +
                        "<div class='content'>" +
                        "<p>Bonjour %s %s,</p>" +
                        "<p>Une nouvelle formation a ete enregistree pour votre UP <strong>%s</strong>.</p>" +
                        "<ul>" +
                        "<li><strong>Titre :</strong> %s</li>" +
                        "<li><strong>Domaine :</strong> %s</li>" +
                        "<li><strong>Dates :</strong> %s - %s</li>" +
                        "</ul>" +
                        "<p>Merci de proceder a la planification des seances.</p>" +
                        "</div>" +
                        "<div class='footer'>" +
                        "<p>Ceci est un e-mail automatique, merci de ne pas y repondre.</p>" +
                        "<p>&copy; Esprit - Direction du Developpement et de la Formation</p>" +
                        "</div></div></body></html>",
                        cup.getPrenom(), cup.getNom(),
                        formation.getUp().getLibelle(),
                        formation.getTitreFormation(),
                        formation.getDomaine() != null ? formation.getDomaine() : "N/A",
                        formation.getDateDebut(),
                        formation.getDateFin());
                outlookMailService.sendMail(cup.getMail(), subject, html);
            } catch (Exception ex) {
                log.warn("Echec notification CUP {} : {}", cup.getMail(), ex.getMessage());
            }
        }
    }

    // ── Collecter tous les emails des personnes concernées par une formation ──
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

    // ── Envoyer des emails à une liste de destinataires avec gestion d'erreur individuelle ──
    private void sendEmailsSafely(Set<String> emails, String subject, String html) {
        log.info("sendEmailsSafely: envoi a {} destinataires, sujet={}", emails.size(), subject);
        int successCount = 0;
        int failCount = 0;
        for (String email : emails) {
            try {
                outlookMailService.sendMail(email, subject, html);
                successCount++;
                log.info("Email envoye avec succes a {}", email);
            } catch (Exception ex) {
                failCount++;
                log.warn("Echec envoi email a {} : {}", email, ex.getMessage());
            }
        }
        log.info("sendEmailsSafely: termine - {} succes, {} echecs sur {} destinataires",
                successCount, failCount, emails.size());
    }

    // ── Template HTML réutilisable pour les notifications de changement d'état ──
    private String buildStateNotificationHtml(Formation formation, String title, String message, String color) {
        StringBuilder seancesHtml = new StringBuilder();
        if (formation.getSeances() != null) {
            for (SeanceFormation seance : formation.getSeances()) {
                seancesHtml.append(String.format(
                        "<li>Le %s de %s a %s en salle %s</li>",
                        seance.getDateSeance(),
                        seance.getHeureDebut(),
                        seance.getHeureFin(),
                        seance.getSalle() != null ? seance.getSalle() : "A definir"));
            }
        }

        // Animateurs
        String animateursStr = "";
        if (formation.getSeances() != null) {
            animateursStr = formation.getSeances().stream()
                    .flatMap(s -> s.getAnimateurs() != null ? s.getAnimateurs().stream() : java.util.stream.Stream.empty())
                    .map(a -> a.getNom() + " " + a.getPrenom())
                    .distinct()
                    .collect(Collectors.joining(", "));
        }
        if (formation.getExterneFormateurNom() != null && !formation.getExterneFormateurNom().isBlank()) {
            animateursStr += (animateursStr.isEmpty() ? "" : ", ") + formation.getExterneFormateurNom() + " " + formation.getExterneFormateurPrenom();
        }

        return "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: " + color + "; color: white; padding: 15px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: " + color + "; }" +
                "ul { padding-left: 20px; } li { margin-bottom: 5px; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>" + title + "</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>" + message + "</p>" +
                "<ul>" +
                "<li><strong>Titre :</strong> " + formation.getTitreFormation() + "</li>" +
                "<li><strong>Domaine :</strong> " + (formation.getDomaine() != null ? formation.getDomaine() : "N/A") + "</li>" +
                "<li><strong>Type :</strong> " + (formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : "N/A") + "</li>" +
                "<li><strong>Dates :</strong> " + formation.getDateDebut() + " - " + formation.getDateFin() + "</li>" +
                (!animateursStr.isEmpty() ? "<li><strong>Animateurs :</strong> " + animateursStr + "</li>" : "") +
                "</ul>" +
                (!seancesHtml.isEmpty() ? "<p><strong>Detail des seances :</strong></p><ul>" + seancesHtml.toString() + "</ul>" : "") +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y repondre.</p>" +
                "<p>&copy; Esprit - Direction du Developpement et de la Formation</p>" +
                "</div></div></body></html>";
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
            String ensId = p.getEnseignant().getId();
            if (!newEnsIds.contains(ensId)) {
                presenceRepository.delete(p);
            }
        }

        // Ajouter les presences manquantes pour les nouveaux enseignants
        for (String id : newEnsIds) {
            boolean exists = oldList.stream()
                    .anyMatch(p -> p.getEnseignant().getId().equals(id));
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
        removeFormationCalendar(formation);
        formationRepository.delete(formation);
    }

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private String formatDate(java.util.Date date) {
        return date.toInstant().atZone(ZoneId.of(FormationWorkflowServiceHelper.TIMEZONE_TUNIS)).toLocalDate()
                .format(DATE_FMT);
    }

    private String formatTime(java.sql.Time time) {
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

    private String buildEmailContent(Formation formation) {
        String animateursStr = formation.getSeances().stream()
                .flatMap(s -> s.getAnimateurs().stream())
                .map(e -> e.getNom() + " " + e.getPrenom())
                .distinct()
                .collect(Collectors.joining(", "));

        if (formation.getExterneFormateurNom() != null && !formation.getExterneFormateurNom().isBlank()) {
            animateursStr += (animateursStr.isEmpty() ? "" : ", ") + formation.getExterneFormateurNom() + " "
                    + formation.getExterneFormateurPrenom();
        }

        StringBuilder seancesHtml = new StringBuilder();
        for (SeanceFormation seance : formation.getSeances()) {
            seancesHtml.append(String.format(
                    "<div>Le %s de %s a %s en salle %s</div>",
                    formatDate(seance.getDateSeance()),
                    formatTime(seance.getHeureDebut()),
                    formatTime(seance.getHeureFin()),
                    seance.getSalle()));
        }

        return "<html><body><h1>" + formation.getTitreFormation() + "</h1>" +
                "<p>Animiee par : " + animateursStr + "</p>" +
                "<h3>Detail des seances :</h3>" + seancesHtml.toString() + "</body></html>";
    }

    public void notifyTeachersOfApprovedFormation(Formation formation) {
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

        String subject = "[D2F] Nouvelle Formation Disponible : " + formation.getTitreFormation();
        String htmlContent = buildApprovalNotificationHtml(formation);

        for (Enseignant e : recipients) {
            if (e.getMail() == null || e.getMail().isBlank()) continue;
            try {
                outlookMailService.sendMail(e.getMail(), subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de notification pour l'enseignant {} : {}", e.getMail(), ex.getMessage());
            }
        }
    }

    private String buildApprovalNotificationHtml(Formation formation) {
        StringBuilder seancesHtml = new StringBuilder();
        if (formation.getSeances() != null) {
            for (SeanceFormation seance : formation.getSeances()) {
                seancesHtml.append(String.format(
                        "<li>Le %s de %s a %s en salle %s</li>",
                        seance.getDateSeance(),
                        seance.getHeureDebut(),
                        seance.getHeureFin(),
                        seance.getSalle() != null ? seance.getSalle() : "A definir"));
            }
        }
        return "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #1b5e20; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: #1b5e20; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Nouvelle Formation Disponible</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>Une nouvelle formation a ete approuvee et est maintenant visible :</p>" +
                "<ul>" +
                "<li><strong>Titre :</strong> " + formation.getTitreFormation() + "</li>" +
                "<li><strong>Domaine :</strong> " + (formation.getDomaine() != null ? formation.getDomaine() : "N/A") + "</li>" +
                "<li><strong>Dates :</strong> " + formation.getDateDebut() + " - " + formation.getDateFin() + "</li>" +
                "</ul>" +
                "<p><strong>Seances :</strong></p><ul>" + seancesHtml.toString() + "</ul>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y répondre.</p>" +
                "<p>&copy; Esprit - Direction du Développement et de la Formation</p>" +
                "</div></div></body></html>";
    }

    public void notifyCUPOfApprovedFormation(Formation formation) {
        if (formation.getUp() == null)
            return;
        List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
        String subject = "[D2F] Formation Approuvee : " + formation.getTitreFormation();
        String htmlContent = String.format(
                "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #1565c0; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: #1565c0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Formation Approuvee</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>La formation <strong>%s</strong> a ete approuvee et est maintenant visible.</p>" +
                "<ul>" +
                "<li><strong>Domaine :</strong> %s</li>" +
                "<li><strong>Dates :</strong> %s - %s</li>" +
                "<li><strong>UP :</strong> %s</li>" +
                "</ul>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y répondre.</p>" +
                "<p>&copy; Esprit - Direction du Développement et de la Formation</p>" +
                "</div></div></body></html>",
                formation.getTitreFormation(),
                formation.getDomaine() != null ? formation.getDomaine() : "N/A",
                formation.getDateDebut(),
                formation.getDateFin(),
                formation.getUp().getLibelle());
        for (Enseignant cup : cups) {
            if (cup.getMail() == null || cup.getMail().isBlank()) continue;
            try {
                outlookMailService.sendMail(cup.getMail(), subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de notification CUP {} : {}", cup.getMail(), ex.getMessage());
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
        String animateursStr = freshSeance.getAnimateurs().stream()
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

    private void sendCalendarNotification(Set<String> emails, boolean isNewEvent, Formation freshFormation) {
        String subjectType = isNewEvent ? "Invitation" : "Mise a jour";
        String mailSubject = String.format("[D2F] %s : %s", subjectType, freshFormation.getTitreFormation());
        String htmlContent = buildEmailContent(freshFormation);

        for (String email : emails) {
            try {
                outlookMailService.sendMail(email, mailSubject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de l'envoi de la notification calendar a {} : {}", email, ex.getMessage());
            }
        }
    }

    public void removeSeanceFromCalendar(SeanceFormation seance) {
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

            for (String email : emails) {
                if (email == null || email.isBlank()) continue;
                try {
                    outlookMailService.sendMail(email, mailSubject, htmlContent);
                } catch (Exception mailEx) {
                    log.warn("Echec envoi mail d'annulation a {} : {}", email, mailEx.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("Erreur lors de l'envoi des mails d'annulation : {}", ex.getMessage());
        }
    }

    private String buildCancellationSeanceHtml(SeanceFormation seance) {
        Formation formation = seance.getFormation();
        return "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #c62828; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: #c62828; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Annulation de Seance</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>Nous vous informons que la seance suivante a ete <strong>annulee</strong> :</p>" +
                "<ul>" +
                "<li><strong>Formation :</strong> " + formation.getTitreFormation() + "</li>" +
                "<li><strong>Date :</strong> " + seance.getDateSeance() + "</li>" +
                "<li><strong>Heure :</strong> " + seance.getHeureDebut() + " - " + seance.getHeureFin() + "</li>" +
                "<li><strong>Salle :</strong> " + (seance.getSalle() != null ? seance.getSalle() : "A definir") + "</li>" +
                "</ul>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y repondre.</p>" +
                "<p>&copy; Esprit - Direction du Developpement et de la Formation</p>" +
                "</div></div></body></html>";
    }

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
        String subject = "[D2F] Annulation de Formation : " + freshFormation.getTitreFormation();
        String htmlContent = buildCancellationFormationHtml(freshFormation);
        for (String email : allRecipientEmails) {
            try {
                outlookMailService.sendMail(email, subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec envoi mail d'annulation formation a {} : {}", email, ex.getMessage());
            }
        }

        // Supprimer les evenements Outlook calendar pour chaque seance
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
    }

    /**
     * Supprime uniquement les evenements calendrier Outlook d'une formation (sans envoyer d'emails).
     * Utilise par notifyAnnulation qui gere les emails separement.
     */
    private void removeFormationCalendarEvents(Formation formation) {
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
        StringBuilder seancesHtml = new StringBuilder();
        if (formation.getSeances() != null) {
            for (SeanceFormation seance : formation.getSeances()) {
                seancesHtml.append(String.format(
                        "<li>Le %s de %s a %s en salle %s</li>",
                        seance.getDateSeance(),
                        seance.getHeureDebut(),
                        seance.getHeureFin(),
                        seance.getSalle() != null ? seance.getSalle() : "A definir"));
            }
        }
        return "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #c62828; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: #c62828; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Annulation de Formation</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>Nous vous informons que la formation suivante a ete <strong>annulee</strong> :</p>" +
                "<ul>" +
                "<li><strong>Titre :</strong> " + formation.getTitreFormation() + "</li>" +
                "<li><strong>Domaine :</strong> " + (formation.getDomaine() != null ? formation.getDomaine() : "N/A") + "</li>" +
                "<li><strong>Dates prevues :</strong> " + formation.getDateDebut() + " - " + formation.getDateFin() + "</li>" +
                "</ul>" +
                "<p><strong>Seances annulees :</strong></p><ul>" + seancesHtml.toString() + "</ul>" +
                "<p>Veuillez ne pas vous presenter aux seances susmentionnees.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y repondre.</p>" +
                "<p>&copy; Esprit - Direction du Developpement et de la Formation</p>" +
                "</div></div></body></html>";
    }

    public FormationDTO getFormationWorkflowById(Long formationId) {
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
        return mapFormationToDTO(formation);
    }

    @Transactional(readOnly = true)
    public List<FormationDTO> getAllFormationWorkflows() {
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
        return formations.stream().map(this::mapFormationToDTO).toList();
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

    public FormationDTO mapFormationToDTO(Formation formation) {
        FormationDTO dto = new FormationDTO();
        dto.setIdFormation(formation.getIdFormation());
        dto.setIdBesoinFormation(formation.getIdBesoinFormation());
        dto.setTypeBesoin(formation.getTypeBesoin());
        dto.setTitreFormation(formation.getTitreFormation());
        dto.setTypeFormation(formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : null);
        dto.setDateDebut(formation.getDateDebut());
        dto.setDateFin(formation.getDateFin());
        dto.setEtatFormation(formation.getEtatFormation() != null ? formation.getEtatFormation().toString() : null);
        dto.setCoutFormation(formation.getCoutFormation() != null ? formation.getCoutFormation().floatValue() : 0.0f);
        dto.setOrganismeRefExterne(formation.getOrganismeRefExterne());
        dto.setCoutHebergement(formation.getCoutHebergement() != null ? formation.getCoutHebergement().floatValue() : 0.0f);
        dto.setCoutRepas(formation.getCoutRepas() != null ? formation.getCoutRepas().floatValue() : 0.0f);
        dto.setCoutTransport(formation.getCoutTransport() != null ? formation.getCoutTransport().floatValue() : 0.0f);
        dto.setAcquis(formation.getAcquis());
        dto.setCompetance(formation.getCompetance());
        dto.setDomaine(formation.getDomaine());
        dto.setEvalMethods(formation.getEvalMethods());
        dto.setIndicateurs(formation.getIndicateurs());
        dto.setObjectifs(formation.getObjectifs());
        dto.setObjectifsPedago(formation.getObjectifsPedago());
        dto.setPopulationCible(formation.getPopulationCible());
        dto.setExterneFormateurEmail(formation.getExterneFormateurEmail());
        dto.setExterneFormateurNom(formation.getExterneFormateurNom());
        dto.setExterneFormateurPrenom(formation.getExterneFormateurPrenom());
        dto.setPrerequis(formation.getPrerequis());
        dto.setChargeHoraireGlobal(formation.getChargeHoraireGlobal() != null ? formation.getChargeHoraireGlobal().intValue() : 0);
        dto.setOuverte(formation.isOuverte());
        dto.setInscriptionsOuvertes(formation.isInscriptionsOuvertes());
        dto.setCertifGenerated(formation.isCertifGenerated());
        dto.setPeriodCode(formation.getPeriodCode() != null ? formation.getPeriodCode().name() : null);
        dto.setCustomPeriodLabel(formation.getCustomPeriodLabel());

        if (formation.getSeances() != null) {
            dto.setSeances(formation.getSeances().stream().map(this::mapSeanceToDTO).toList());
        }
        if (formation.getAnimateurs() != null) {
            Hibernate.initialize(formation.getAnimateurs());
            dto.setAnimateurs(formation.getAnimateurs().stream().map(this::mapEnseignantToDTO).toList());
        }
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
        return dto;
    }

    public List<FormationDTO> getFormationsByAnimateurEmail(String email) {
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
        return enCours.stream().map(this::mapFormationToDTO).toList();
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
            if (item == null || item.getIdParticipation() == null) continue;
            Presence existing = indexById.get(item.getIdParticipation());
            if (existing == null) continue; // ignore presences that don't belong to this seance
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
        double taux = total == 0 ? 0.0 : (double) presents * 100.0 / total;
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

    public List<FormationDTO> getFormationsAchevees() {
        List<Formation> achevees = formationRepository.findByEtatFormation(EtatFormation.ACHEVE);
        return achevees.stream().map(this::mapFormationToDTO).toList();
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
        List<FormationDTO> animateur = formationRepository
                .findDistinctBySeances_Animateurs_Id(enseignantId)
                .stream().map(this::mapFormationToDTO).toList();

        List<FormationDTO> participant = formationRepository
                .findDistinctBySeances_Participants_Id(enseignantId)
                .stream().map(this::mapFormationToDTO).toList();

        return new FormationsByRoleDTO(animateur, participant);
    }

    @Transactional
    public FormationDTO setInscriptionsOuvertes(Long formationId, boolean ouvert) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));
        formation.setInscriptionsOuvertes(ouvert);
        Formation saved = formationRepository.save(formation);
        return mapFormationToDTO(saved);
    }

    public List<FormationDTO> getFormationsVisibles() {
        return formationRepository.findAll().stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.VISIBLE
                        || f.getEtatFormation() == EtatFormation.PLANIFIE
                        || f.getEtatFormation() == EtatFormation.EN_COURS
                        || f.isInscriptionsOuvertes())
                .map(this::mapFormationToDTO)
                .toList();
    }

    public List<FormationDTO> getFormationsParUp(String upId) {
        return formationRepository
                .findByUp_Id(upId)
                .stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.VISIBLE
                        || f.getEtatFormation() == EtatFormation.PLANIFIE
                        || f.getEtatFormation() == EtatFormation.EN_COURS
                        || f.isInscriptionsOuvertes())
                .map(this::mapFormationToDTO)
                .toList();
    }

    public List<FormationDTO> getFormationsParDepartement(String deptId) {
        return formationRepository.findByDepartement_Id(deptId)
                .stream()
                .map(this::mapFormationToDTO)
                .toList();
    }
}
