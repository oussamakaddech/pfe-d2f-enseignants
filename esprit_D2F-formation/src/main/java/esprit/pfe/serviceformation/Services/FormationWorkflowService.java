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

        sendCreationNotifications(formation);

        formation.setSeances(seances);
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

    private void sendCreationNotifications(Formation formation) {
        try {
            String subject = "[D2F] Nouvelle Formation Creee : " + formation.getTitreFormation();
            String htmlContent = String.format(
                    "<h3>Nouvelle Formation Enregistree</h3>" +
                            "<p>Une nouvelle formation a ete creee.</p>" +
                            "<ul>" +
                            "<li><strong>Titre :</strong> %s</li>" +
                            "<li><strong>Date Debut :</strong> %s</li>" +
                            "<li><strong>Type :</strong> %s</li>" +
                            "<li><strong>Domaine :</strong> %s</li>" +
                            "</ul>",
                    formation.getTitreFormation(),
                    formation.getDateDebut(),
                    formation.getTypeFormation(),
                    formation.getDomaine());
            outlookMailService.sendMail(ORGANIZER_EMAIL, subject, htmlContent);

            if (formation.getUp() != null) {
                List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
                for (Enseignant cup : cups) {
                    String cupSubject = "[D2F] Formation a planifier : " + formation.getTitreFormation();
                    String cupHtml = String.format(
                            "<h3>Action Requise : Planification</h3>" +
                                    "<p>Bonjour %s %s,</p>" +
                                    "<p>Une nouvelle formation UP %s a ete enregistree.</p>",
                            cup.getPrenom(), cup.getNom(),
                            formation.getUp().getLibelle());
                    outlookMailService.sendMail(cup.getMail(), cupSubject, cupHtml);
                }
            }
        } catch (Exception ex) {
            log.warn("Echec de l'envoi des notifications de creation : {}", ex.getMessage());
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

    private void handleEtatTransitions(Formation formation, EtatFormation oldEtat) {
        if (formation.getEtatFormation() == EtatFormation.PLANIFIE) {
            synchronizeFormationCalendar(formation);
        } else if (formation.getEtatFormation() == EtatFormation.VISIBLE && oldEtat != EtatFormation.VISIBLE) {
            notifyTeachersOfApprovedFormation(formation);
            notifyCUPOfApprovedFormation(formation);
        } else if (formation.getEtatFormation() == EtatFormation.ANNULE) {
            removeFormationCalendar(formation);
        }
    }

    private void syncPresencesForSeances(List<SeanceFormation> seances, List<String> partIds) {
        if (partIds == null)
            return;
        for (SeanceFormation sf : seances) {
            if (sf.getIdSeance() != null) {
                syncPresencesForSeance(sf, partIds);
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

    private void syncPresencesForSeance(SeanceFormation sf, List<String> newEnsIds) {
        List<Presence> oldList = presenceRepository.findBySeanceFormation_IdSeance(sf.getIdSeance());
        Set<String> newSet = new HashSet<>(newEnsIds);

        for (Presence p : oldList) {
            String ensId = p.getEnseignant().getId();
            if (!newSet.contains(ensId)) {
                presenceRepository.delete(p);
            }
        }

        for (String id : newSet) {
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

    private String buildCancellationEmailContent(String formationTitle) {
        return "<html><body><h1>Annulation : " + formationTitle + "</h1></body></html>";
    }

    public void notifyTeachersOfApprovedFormation(Formation formation) {
        List<Enseignant> allEnseignants = enseignantRepository.findAll();
        String subject = "[D2F] Nouvelle Formation Disponible : " + formation.getTitreFormation();
        String htmlContent = "Formation disponible : " + formation.getTitreFormation();

        for (Enseignant e : allEnseignants) {
            try {
                outlookMailService.sendMail(e.getMail(), subject, htmlContent);
            } catch (Exception ex) {
                log.warn("Echec de notification pour l'enseignant {} : {}", e.getMail(), ex.getMessage());
            }
        }
    }

    public void notifyCUPOfApprovedFormation(Formation formation) {
        if (formation.getUp() == null)
            return;
        List<Enseignant> cups = enseignantRepository.findByUpAndCup(formation.getUp(), "O");
        String subject = "[D2F] Formation Approuvee : " + formation.getTitreFormation();
        for (Enseignant cup : cups) {
            try {
                outlookMailService.sendMail(cup.getMail(), subject,
                        "Formation approuvee : " + formation.getTitreFormation());
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
            freshSeance.getAnimateurs().forEach(a -> emails.add(a.getMail()));
        }
        if (freshSeance.getParticipants() != null) {
            freshSeance.getParticipants().forEach(p -> emails.add(p.getMail()));
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

        sendCalendarNotification(emails, isNewEvent, freshFormation);
    }

    private void sendCalendarNotification(Set<String> emails, boolean isNewEvent, Formation freshFormation) {
        String subjectType = isNewEvent ? "Invitation" : "Mise a jour";
        String mailSubject = String.format("[D2F] %s : %s", subjectType, freshFormation.getTitreFormation());
        String htmlContent = buildEmailContent(freshFormation);

        for (String email : emails) {
            outlookMailService.sendMail(email, mailSubject, htmlContent);
        }
    }

    public void removeSeanceFromCalendar(SeanceFormation seance) {
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
            String htmlContent = buildCancellationEmailContent(seance.getFormation().getTitreFormation());

            Set<String> emails = new HashSet<>();
            if (seance.getAnimateurs() != null)
                seance.getAnimateurs().forEach(a -> emails.add(a.getMail()));
            if (seance.getParticipants() != null)
                seance.getParticipants().forEach(p -> emails.add(p.getMail()));

            if (seance.getFormation().getExterneFormateurEmail() != null
                    && !seance.getFormation().getExterneFormateurEmail().isBlank()) {
                emails.add(seance.getFormation().getExterneFormateurEmail());
            }
            emails.add(ORGANIZER_EMAIL);

            for (String email : emails) {
                outlookMailService.sendMail(email, mailSubject, htmlContent);
            }
        } catch (Exception ex) {
            log.error("Erreur lors de l'envoi des mails d'annulation : {}", ex.getMessage());
        }
    }

    public void removeFormationCalendar(Formation formation) {
        Formation freshFormation = formationRepository.findById(formation.getIdFormation())
                .orElseThrow(() -> new IllegalStateException("La formation a ete supprimee."));

        try {
            String subject = "[D2F] Annulation Globale : " + freshFormation.getTitreFormation();
            outlookMailService.sendMail(ORGANIZER_EMAIL, subject,
                    "Formation annullee : " + freshFormation.getTitreFormation());
        } catch (Exception ex) {
            log.warn("Impossible d'envoyer la notification d'annulation : {}", ex.getMessage());
        }

        for (SeanceFormation seance : freshFormation.getSeances()) {
            removeSeanceFromCalendar(seance);
        }
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
            dto.setEtatFormation(formation.getEtatFormation().toString());
            dto.setCoutFormation(formation.getCoutFormation());
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
