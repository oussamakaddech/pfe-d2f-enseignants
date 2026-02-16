package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.*;
import esprit.pfe.serviceformation.feign.EvaluationClient;
import esprit.pfe.serviceformation.Microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.Microsoft.OutlookMailService;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Time;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FormationWorkflowService {

    @Autowired
    private DocumentRepository documentRepository;
    @Autowired
    private FormationRepository formationRepository;
    @Autowired
    private SeanceFormationRepository seanceFormationRepository;
    @Autowired
    private EnseignantRepository enseignantRepository;
    @Autowired
    private PresenceRepository presenceRepository;
    @Autowired
    private DeptRepository departementRepository;
    @Autowired
    private UpRepository upRepository;
    @Autowired
    private EvaluationPublisher evaluationPublisher;
    @Autowired
    private OutlookCalendarService outlookCalendarService;
    @Autowired
    private OutlookMailService outlookMailService;

    private static final String ORGANIZER_EMAIL = "Application.Formationdesformateurs@Esprit.tn";


    private Time parseTime(String heure) {
        if (heure == null || heure.isBlank()) {
            throw new IllegalArgumentException("Heure invalide (vide). Format attendu: HH:mm ou HH:mm:ss");
        }
        if (heure.matches("^\\d{2}:\\d{2}$")) {
            heure += ":00";
        }
        try {
            return Time.valueOf(heure);
        } catch (Exception e) {
            throw new IllegalArgumentException("Heure invalide (" + heure + "). Format attendu: HH:mm ou HH:mm:ss");
        }
    }

    private OffsetDateTime convertToOffsetDateTime(java.util.Date dateUtil, java.sql.Time time) {
        LocalDate localDate = dateUtil.toInstant()
                .atZone(ZoneId.of("Africa/Tunis"))
                .toLocalDate();
        LocalTime localTime = time.toLocalTime();
        ZonedDateTime zonedDateTime = ZonedDateTime.of(localDate, localTime, ZoneId.of("Africa/Tunis"));
        return zonedDateTime.toOffsetDateTime();
    }

    /**
     * ✅ CORRECTIF: Ajout du paramètre ignoreFormationId
     */
    private void ensureNoConflict(
            String userId,
            Date date,
            Time debut,
            Time fin,
            boolean isAnimateur,
            Long ignoreSeanceId,
            Long ignoreFormationId  // ← PARAMÈTRE AJOUTÉ
    ) {
        // 1) SQL rapide
        boolean existsConflict = (ignoreSeanceId == null)
                ? seanceFormationRepository.existsSeanceConflict(userId, date, debut, fin)
                : seanceFormationRepository.existsSeanceConflictIgnoringSelf(userId, date, debut, fin, ignoreSeanceId);

        if (!existsConflict) {
            return;
        }

        // 2) Charger toutes les séances du jour
        List<SeanceFormation> existantes = isAnimateur
                ? seanceFormationRepository.findByAnimateurAndDate(userId, date)
                : seanceFormationRepository.findByParticipantAndDate(userId, date);

        // 3) ✅ CORRECTIF: Filtrer pour ignorer les séances de la formation en cours
        SeanceFormation conflit = existantes.stream()
                .filter(s -> ignoreSeanceId == null || !s.getIdSeance().equals(ignoreSeanceId))
                .filter(s -> ignoreFormationId == null || !s.getFormation().getIdFormation().equals(ignoreFormationId))  // ← FILTRE AJOUTÉ
                .filter(s -> s.getHeureDebut().before(fin) && s.getHeureFin().after(debut))
                .findFirst()
                .orElse(null);

        // 4) Si pas de conflit réel, sortir
        if (conflit == null) {
            return;
        }

        // 5) Générer l'exception
        Enseignant user = enseignantRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable : " + userId));

        String role = isAnimateur ? "animateur" : "participant";
        String userInfo = user.getNom() + " " + user.getPrenom() + " (" + user.getMail() + ")";
        String formationTitre = conflit.getFormation().getTitreFormation();

        throw new RuntimeException(
                String.format("⚠️ Conflit %s %s : séance le %tF de %tR à %tR pour la formation « %s »",
                        role, userInfo, conflit.getDateSeance(),
                        conflit.getHeureDebut(), conflit.getHeureFin(), formationTitre)
        );
    }

    @Transactional
    public Formation createFormationWorkflow(FormationWorkflowRequest request) {
        List<String> partIds = Optional.ofNullable(request.getParticipantsIds()).orElse(Collections.emptyList());
        List<FormationWorkflowRequest.SeanceRequest> seanceReqs =
                Optional.ofNullable(request.getSeances()).orElse(Collections.emptyList());

        Formation formation = new Formation();
        formation.setTitreFormation(request.getTitreFormation());
        formation.setDateDebut(request.getDateDebut());
        formation.setDateFin(request.getDateFin());
        formation.setTypeFormation(request.getTypeFormation());
        formation.setExterneFormateurNom(request.getExterneFormateurNom());
        formation.setExterneFormateurPrenom(request.getExterneFormateurPrenom());
        formation.setExterneFormateurEmail(request.getExterneFormateurEmail());
        formation.setEtatFormation(EtatFormation.ENREGISTRE);
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

        if (request.getUpId() != null && !request.getUpId().isBlank()) {
            Up up = upRepository.findById(request.getUpId())
                    .orElseThrow(() -> new IllegalArgumentException("UP introuvable pour l'id " + request.getUpId()));
            formation.setUp(up);
        }

        if (request.getDepartementId() != null && !request.getDepartementId().isBlank()) {
            Dept dept = departementRepository.findById(request.getDepartementId())
                    .orElseThrow(() -> new IllegalArgumentException("Département introuvable pour l'id " + request.getDepartementId()));
            formation.setDepartement(dept);
        }

        formation = formationRepository.save(formation);

        List<Enseignant> participants = partIds.isEmpty() ? List.of() : enseignantRepository.findAllById(partIds);

        List<SeanceFormation> seances = new ArrayList<>();
        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            if (sr.getDateSeance().before(request.getDateDebut()) ||
                    sr.getDateSeance().after(request.getDateFin())) {
                throw new RuntimeException("Séance hors plage : " + sr.getDateSeance());
            }

            Time hd = parseTime(sr.getHeureDebut());
            Time hf = parseTime(sr.getHeureFin());

            List<String> seanceAnimIds = Optional.ofNullable(sr.getAnimateursIds())
                    .orElse(Collections.emptyList());

            // ✅ CORRECTIF: Passer null pour ignoreFormationId en création
            for (String aid : seanceAnimIds) {
                ensureNoConflict(aid, sr.getDateSeance(), hd, hf, true, null, null);
            }
            for (String pid : partIds) {
                ensureNoConflict(pid, sr.getDateSeance(), hd, hf, false, null, null);
            }

            SeanceFormation sf = new SeanceFormation();
            sf.setFormation(formation);
            sf.setDateSeance(sr.getDateSeance());
            sf.setHeureDebut(hd);
            sf.setHeureFin(hf);
            sf.setTypeSeance(sr.getTypeSeance());
            sf.setContenus(sr.getContenus());
            sf.setMethodes(sr.getMethodes());
            sf.setDureeTheorique(sr.getDureeTheorique());
            sf.setDureePratique(sr.getDureePratique());
            sf.setSalle(sr.getSalle());

            if (sr.getSalle() != null && !sr.getSalle().isBlank()) {
                if (seanceFormationRepository.existsSalleConflict(sr.getSalle(), sr.getDateSeance(), hd, hf)) {
                    throw new RuntimeException(
                            "⚠️ Conflit de salle : « " + sr.getSalle() + " » est déjà réservée le "
                                    + sr.getDateSeance() + " de " + sr.getHeureDebut() + " à " + sr.getHeureFin()
                    );
                }
            }

// ✅ CORRECTIF: Utiliser ArrayList
            List<Enseignant> animateursSeance = seanceAnimIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(enseignantRepository.findAllById(seanceAnimIds));

            sf.setAnimateurs(animateursSeance);
            sf.setParticipants(participants);

            seances.add(sf);
        }

        seanceFormationRepository.saveAll(seances);

        List<Presence> allPresences = new ArrayList<>();
        for (SeanceFormation sf : seances) {
            if (sf.getParticipants() != null) {
                for (Enseignant pt : sf.getParticipants()) {
                    Presence p = new Presence();
                    p.setSeanceFormation(sf);
                    p.setEnseignant(pt);
                    p.setPresence(false);
                    p.setCommentaire("Présence à valider");
                    allPresences.add(p);
                }
            }
        }
        presenceRepository.saveAll(allPresences);

        Set<String> seen = new HashSet<>();
        List<EvaluationFormateurDTO> evaluationDTOs = new ArrayList<>();
        for (SeanceFormation sf : seances) {
            for (Enseignant pt : sf.getParticipants()) {
                String key = pt.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
                    dto.setEnseignantId(pt.getId());
                    dto.setFormationId(formation.getIdFormation());
                    dto.setNote(0f);
                    dto.setSatisfaisant(false);
                    dto.setCommentaire("N/A");
                    evaluationDTOs.add(dto);
                }
            }
            for (Enseignant anim : sf.getAnimateurs()) {
                String key = anim.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
                    dto.setEnseignantId(anim.getId());
                    dto.setFormationId(formation.getIdFormation());
                    dto.setNote(0f);
                    dto.setSatisfaisant(false);
                    dto.setCommentaire("N/A");
                    evaluationDTOs.add(dto);
                }
            }
        }

        evaluationPublisher.sendCreate(
                new EvaluationBatchMessage(
                        formation.getIdFormation(),
                        evaluationDTOs.stream()
                                .map(dto -> new EvaluationBatchMessage.EvaluationItem(
                                        dto.getEnseignantId(),
                                        dto.getNote(),
                                        dto.isSatisfaisant(),
                                        dto.getCommentaire()))
                                .toList()
                )
        );

        formation.setSeances(seances);
        return formationRepository.save(formation);
    }

    @Transactional
    public Formation updateFormationWorkflow(Long formationId, FormationWorkflowRequest request) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));

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

        if (request.getUpId() != null && !request.getUpId().isBlank()) {
            Up up = upRepository.findById(request.getUpId())
                    .orElseThrow(() -> new IllegalArgumentException("UP introuvable"));
            formation.setUp(up);
        } else {
            formation.setUp(null);
        }

        if (request.getDepartementId() != null && !request.getDepartementId().isBlank()) {
            Dept dept = departementRepository.findById(request.getDepartementId())
                    .orElseThrow(() -> new IllegalArgumentException("Département introuvable"));
            formation.setDepartement(dept);
        } else {
            formation.setDepartement(null);
        }

        List<String> partIds = Optional.ofNullable(request.getParticipantsIds()).orElse(Collections.emptyList());
        List<FormationWorkflowRequest.SeanceRequest> seanceReqs =
                Optional.ofNullable(request.getSeances()).orElse(Collections.emptyList());

        Set<String> allIds = new HashSet<>(partIds);
        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            if (sr.getAnimateursIds() != null) {
                allIds.addAll(sr.getAnimateursIds());
            }
        }

        Map<String, Enseignant> enseignantMap =
                enseignantRepository.findAllById(allIds)
                        .stream()
                        .collect(Collectors.toMap(Enseignant::getId, Function.identity()));

        List<SeanceFormation> managedList = formation.getSeances();
        if (managedList == null) {
            managedList = new ArrayList<>();
            formation.setSeances(managedList);
        }

        managedList.size();

        if (managedList.isEmpty()) {
            List<SeanceFormation> dbSeances = seanceFormationRepository.findByFormation_IdFormation(formationId);
            if (dbSeances != null && !dbSeances.isEmpty()) {
                managedList.addAll(dbSeances);
            }
        }

        log.info("Séances chargées pour formation {}: {}", formationId,
                managedList.stream().map(SeanceFormation::getIdSeance).toList());

        Map<Long, SeanceFormation> existingMap = new HashMap<>();
        for (SeanceFormation sf : new ArrayList<>(managedList)) {
            existingMap.put(sf.getIdSeance(), sf);
        }

        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            boolean isNew = sr.getIdSeance() == null;
            SeanceFormation sf;

            if (isNew) {
                sf = new SeanceFormation();
                sf.setFormation(formation);
            } else {
                sf = existingMap.remove(sr.getIdSeance());
                if (sf == null) {
                    throw new IllegalArgumentException("Séance inconnue : " + sr.getIdSeance());
                }
            }

            sf.setDateSeance(sr.getDateSeance());
            Time hd = parseTime(sr.getHeureDebut());
            Time hf = parseTime(sr.getHeureFin());
            sf.setHeureDebut(hd);
            sf.setHeureFin(hf);
            sf.setSalle(sr.getSalle());

            if (sr.getSalle() != null && !sr.getSalle().isBlank()) {
                boolean salleEnConflit = isNew
                        ? seanceFormationRepository.existsSalleConflict(sr.getSalle(), sr.getDateSeance(), hd, hf)
                        : seanceFormationRepository.existsSalleConflictIgnoringSelf(
                        sr.getSalle(), sr.getDateSeance(), hd, hf, sr.getIdSeance());
                if (salleEnConflit) {
                    throw new RuntimeException(
                            "⚠️ Conflit de salle pour la séance "
                                    + (isNew ? "" : "[id=" + sr.getIdSeance() + "] ")
                                    + "salle « " + sr.getSalle() + " » le " + sr.getDateSeance()
                                    + " de " + sr.getHeureDebut() + " à " + sr.getHeureFin());
                }
            }

            sf.setTypeSeance(sr.getTypeSeance());
            sf.setContenus(sr.getContenus());
            sf.setMethodes(sr.getMethodes());
            sf.setDureeTheorique(sr.getDureeTheorique());
            sf.setDureePratique(sr.getDureePratique());

            List<String> seanceAnimIds = Optional.ofNullable(sr.getAnimateursIds())
                    .orElse(Collections.emptyList());

            Long ignoreId = isNew ? null : sr.getIdSeance();

            for (String aid : seanceAnimIds) {
                ensureNoConflict(aid, sr.getDateSeance(), hd, hf, true, ignoreId, formationId);
            }
            for (String pid : partIds) {
                ensureNoConflict(pid, sr.getDateSeance(), hd, hf, false, ignoreId, formationId);
            }

            sf.setAnimateurs(seanceAnimIds.isEmpty()
                    ? new ArrayList<>()
                    : seanceAnimIds.stream()
                    .map(enseignantMap::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList())
            );

            sf.setParticipants(partIds.isEmpty()
                    ? new ArrayList<>()
                    : partIds.stream()
                    .map(enseignantMap::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList())
            );

            if (isNew) {
                managedList.add(sf);
            }

        }

        for (SeanceFormation orphan : existingMap.values()) {
            removeSeanceFromCalendar(orphan);
            managedList.remove(orphan);
        }

        if (formation.getEtatFormation() == EtatFormation.PLANIFIE) {
            synchronizeFormationCalendar(formation);
        } else if (formation.getEtatFormation() == EtatFormation.ANNULE) {
            removeFormationCalendar(formation);
        }

        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            if (sr.getIdSeance() != null) {
                SeanceFormation sf = seanceFormationRepository.findById(sr.getIdSeance())
                        .orElse(null);
                if (sf != null) {
                    syncPresencesForSeance(sf, partIds);
                }
            }
        }

        List<EvaluationFormateurDTO> dtos = partIds.stream()
                .map(ensId -> {
                    EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
                    dto.setFormationId(formationId);
                    dto.setEnseignantId(ensId);
                    dto.setNote(0f);
                    dto.setSatisfaisant(false);
                    dto.setCommentaire("N/A");
                    return dto;
                })
                .toList();

        List<EvaluationBatchMessage.EvaluationItem> items = dtos.stream()
                .map(dto -> new EvaluationBatchMessage.EvaluationItem(
                        dto.getEnseignantId(),
                        dto.getNote(),
                        dto.isSatisfaisant(),
                        dto.getCommentaire()))
                .collect(Collectors.toList());

        evaluationPublisher.sendUpdate(new EvaluationBatchMessage(formationId, items));

        return formationRepository.save(formation);
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
                p.setPresence(false);
                p.setCommentaire("Présence à valider");
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

    private String buildCalendarEventContent(Formation formation, SeanceFormation seance, String animateursStr) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");

        return "<!DOCTYPE html><html><head><style>" +
                "body {font-family: 'Segoe UI', sans-serif; color: #333;}" +
                "h3 {color: #c62828; border-bottom: 2px solid #c62828; padding-bottom: 5px;}" +
                "p {margin: 5px 0;}" +
                "strong {color: #c62828;}" +
                "</style></head><body>" +
                "<h3>" + formation.getTitreFormation() + "</h3>" +
                "<p><strong>Date:</strong> " + dateFormat.format(seance.getDateSeance()) + "</p>" +
                "<p><strong>Heure:</strong> " + timeFormat.format(seance.getHeureDebut()) + " - " + timeFormat.format(seance.getHeureFin()) + "</p>" +
                "<p><strong>Salle:</strong> " + seance.getSalle() + "</p>" +
                "<p><strong>Animateurs:</strong> " + animateursStr + "</p>" +
                "<hr><p><em>Ceci est une invitation à une séance de formation planifiée via l'application D2F.</em></p>" +
                "</body></html>";
    }

    private String buildEmailContent(Formation formation, SeanceFormation currentSeance) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");

        String animateursStr = formation.getSeances().stream()
                .flatMap(s -> s.getAnimateurs().stream())
                .map(e -> e.getNom() + " " + e.getPrenom())
                .distinct()
                .collect(Collectors.joining(", "));

        if (formation.getExterneFormateurNom() != null && !formation.getExterneFormateurNom().isBlank()) {
            animateursStr += (animateursStr.isEmpty() ? "" : ", ") + formation.getExterneFormateurNom() + " " + formation.getExterneFormateurPrenom();
        }

        StringBuilder seancesHtml = new StringBuilder();
        for (SeanceFormation seance : formation.getSeances()) {
            boolean isCurrent = seance.getIdSeance().equals(currentSeance.getIdSeance());
            seancesHtml.append(String.format(
                    "<div style='margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; %s'>" +
                            "<strong>Le %s</strong> de <strong>%s</strong> à <strong>%s</strong> en salle <strong>%s</strong>" +
                            "</div>",
                    isCurrent ? "background-color: #ffebee;" : "", // Rouge très clair pour surligner
                    dateFormat.format(seance.getDateSeance()),
                    timeFormat.format(seance.getHeureDebut()),
                    timeFormat.format(seance.getHeureFin()),
                    seance.getSalle()
            ));
        }

        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #c62828; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "h1 { color: #c62828; }" +
                "strong { color: #c62828; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Invitation à une Formation</h2></div>" +
                "<div class='content'>" +
                "<h1>" + formation.getTitreFormation() + "</h1>" +
                "<p>Bonjour,</p>" +
                "<p>Vous êtes invité(e) à participer à la formation <strong>\"" + formation.getTitreFormation() + "\"</strong> qui se déroulera du <strong>" + dateFormat.format(formation.getDateDebut()) + "</strong> au <strong>" + dateFormat.format(formation.getDateFin()) + "</strong>.</p>" +
                "<p><strong>Animée par :</strong> " + animateursStr + "</p>" +
                "<h3>Détail des séances :</h3>" +
                seancesHtml.toString() +
                "<p style='margin-top: 20px;'>Un événement a été ajouté à votre calendrier Outlook. Veuillez accepter l'invitation pour confirmer votre présence.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y répondre.</p>" +
                "<p>&copy; Esprit - Direction du Développement et de la Formation</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    private String buildCancellationEmailContent(String formationTitle, SeanceFormation seance) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
        String seanceDetails = (seance != null)
                ? String.format("La séance du <strong>%s</strong> de <strong>%s</strong> à <strong>%s</strong>",
                dateFormat.format(seance.getDateSeance()),
                timeFormat.format(seance.getHeureDebut()),
                timeFormat.format(seance.getHeureFin()))
                : "";

        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #c62828; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "h1 { color: #c62828; }" +
                "strong { color: #c62828; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Annulation de Formation</h2></div>" +
                "<div class='content'>" +
                "<h1>" + formationTitle + "</h1>" +
                "<p>Bonjour,</p>" +
                "<p>Veuillez noter que " + (seance != null ? seanceDetails : "la formation <strong>\"" + formationTitle + "\"</strong>") + " a été annulée.</p>" +
                "<p>L'événement correspondant a été supprimé de votre calendrier Outlook.</p>" +
                "<p>Nous nous excusons pour tout désagrément que cela pourrait causer.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y répondre.</p>" +
                "<p>&copy; Esprit - Direction du Développement et de la Formation</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    @Transactional
    public void synchronizeFormationCalendar(Formation formation) {
        Formation freshFormation = formationRepository.findById(formation.getIdFormation())
                .orElseThrow(() -> new IllegalStateException("La formation a été supprimée."));

        for (SeanceFormation seance : freshFormation.getSeances()) {
            SeanceFormation freshSeance = seanceFormationRepository.findById(seance.getIdSeance())
                    .orElseThrow(() -> new IllegalStateException("La séance a été supprimée."));

            OffsetDateTime eventStart = convertToOffsetDateTime(freshSeance.getDateSeance(), freshSeance.getHeureDebut());
            OffsetDateTime eventEnd = convertToOffsetDateTime(freshSeance.getDateSeance(), freshSeance.getHeureFin());

            String animateursStr = freshSeance.getAnimateurs().stream()
                    .map(e -> e.getNom() + " " + e.getPrenom())
                    .collect(Collectors.joining(", "));
            if (freshFormation.getExterneFormateurNom() != null && !freshFormation.getExterneFormateurNom().isBlank()) {
                animateursStr += (animateursStr.isEmpty() ? "" : ", ") + freshFormation.getExterneFormateurNom() + " " + freshFormation.getExterneFormateurPrenom();
            }

            String eventSubject = String.format("[D2F] %s : %s", freshFormation.getTitreFormation(), animateursStr);
            String eventHtmlContent = buildCalendarEventContent(freshFormation, freshSeance, animateursStr);

            Set<String> emails = new HashSet<>();
            if (freshSeance.getAnimateurs() != null) {
                freshSeance.getAnimateurs().forEach(a -> emails.add(a.getMail()));
            }
            if (freshSeance.getParticipants() != null) {
                freshSeance.getParticipants().forEach(p -> emails.add(p.getMail()));
            }
            if (freshFormation.getExterneFormateurEmail() != null && !freshFormation.getExterneFormateurEmail().isBlank()) {
                emails.add(freshFormation.getExterneFormateurEmail());
            }
            emails.add(ORGANIZER_EMAIL); // Ajout de l'organisateur pour la traçabilité

            try {
                boolean isNewEvent = freshSeance.getCalendarEventId() == null;

                if (!isNewEvent) {
                    outlookCalendarService.updateEventInCalendar(ORGANIZER_EMAIL, freshSeance.getCalendarEventId(),
                            eventSubject, eventHtmlContent, eventStart, eventEnd, freshSeance.getSalle(), new ArrayList<>(emails));
                    log.info("Événement mis à jour dans le calendrier de l'organisateur (eventId: {})", freshSeance.getCalendarEventId());
                } else {
                    String eventId = outlookCalendarService.addEventToCalendarAndReturnId(ORGANIZER_EMAIL,
                            eventSubject, eventHtmlContent, eventStart, eventEnd, freshSeance.getSalle(), new ArrayList<>(emails));
                    freshSeance.setCalendarEventId(eventId);
                    seanceFormationRepository.save(freshSeance);
                    log.info("Événement créé dans le calendrier de l'organisateur (eventId: {})", eventId);
                }

                String subjectType = isNewEvent ? "Invitation" : "Mise à jour";
                String mailSubject = String.format("[D2F] %s : %s", subjectType, freshFormation.getTitreFormation());
                String htmlContent = buildEmailContent(freshFormation, freshSeance);

                for (String email : emails) {
                    outlookMailService.sendMail(email, mailSubject, htmlContent);
                }
                log.info("E-mails de notification envoyés à {} participants pour la séance {}", emails.size(), freshSeance.getIdSeance());

            } catch (Exception ex) {
                log.error("Erreur lors de la synchronisation de l'événement pour la séance {} : {}", freshSeance.getIdSeance(), ex.getMessage());
            }
        }
    }

    @Transactional
    public void removeSeanceFromCalendar(SeanceFormation seance) {
        if (seance.getCalendarEventId() != null) {
            try {
                outlookCalendarService.deleteEventInCalendar(ORGANIZER_EMAIL, seance.getCalendarEventId());
                log.info("Événement {} supprimé du calendrier de l'organisateur", seance.getCalendarEventId());

                String mailSubject = String.format("[D2F] Annulation : %s", seance.getFormation().getTitreFormation());
                String htmlContent = buildCancellationEmailContent(seance.getFormation().getTitreFormation(), seance);

                Set<String> emails = new HashSet<>();
                seance.getAnimateurs().forEach(a -> emails.add(a.getMail()));
                seance.getParticipants().forEach(p -> emails.add(p.getMail()));
                if (seance.getFormation().getExterneFormateurEmail() != null && !seance.getFormation().getExterneFormateurEmail().isBlank()) {
                    emails.add(seance.getFormation().getExterneFormateurEmail());
                }
                emails.add(ORGANIZER_EMAIL); // Ajout de l'organisateur pour la traçabilité

                for (String email : emails) {
                    outlookMailService.sendMail(email, mailSubject, htmlContent);
                }
                log.info("E-mails d'annulation envoyés pour la séance {}", seance.getIdSeance());

            } catch (Exception ex) {
                log.error("Erreur lors de la suppression de l'événement {} : {}", seance.getCalendarEventId(), ex.getMessage());
            }
        }
    }

    @Transactional
    public void removeFormationCalendar(Formation formation) {
        Formation freshFormation = formationRepository.findById(formation.getIdFormation())
                .orElseThrow(() -> new IllegalStateException("La formation a été supprimée."));

        for (SeanceFormation seance : freshFormation.getSeances()) {
            removeSeanceFromCalendar(seance);
        }
    }


    // Récupération d'une formation avec toutes ses séances et détails
    public FormationDTO getFormationWorkflowById(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable avec l'id : " + formationId));
        if (formation.getSeances() != null) {
            formation.getSeances().forEach(seance -> {
                if (seance.getAnimateurs() != null) seance.getAnimateurs().size();
                if (seance.getParticipants() != null) seance.getParticipants().size();
            });
        }
        return mapFormationToDTO(formation);
    }

    // Récupération de toutes les formations avec leurs séances et détails
    public List<FormationDTO> getAllFormationWorkflows() {
        List<Formation> formations = formationRepository.findAll();
        formations.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(seance -> {
                    if (seance.getAnimateurs() != null) seance.getAnimateurs().size();
                    if (seance.getParticipants() != null) seance.getParticipants().size();
                });
            }
        });
        return formations.stream().map(this::mapFormationToDTO).toList();
    }

    @Transactional
    public void updatePresence(Long idParticipation, boolean isPresent, String commentaire) {
        Presence presence = presenceRepository.findById(idParticipation)
                .orElseThrow(() -> new IllegalArgumentException("Presence introuvable pour id " + idParticipation));
        presence.setPresence(isPresent);
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
        dto.setTypeFormation(formation.getTypeFormation().toString());
        dto.setDateDebut(formation.getDateDebut());
        dto.setDateFin(formation.getDateFin());
        dto.setEtatFormation(formation.getEtatFormation().toString());
        dto.setCoutFormation(formation.getCoutFormation());
        dto.setOrganismeRefExterne(formation.getOrganismeRefExterne());
        dto.setCoutHebergement(formation.getCoutHebergement());
        dto.setCoutFormation(formation.getCoutFormation());
        dto.setCoutRepas(formation.getCoutRepas());
        dto.setCoutTransport(formation.getCoutTransport());
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
        dto.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
        dto.setOuverte(formation.isOuverte());
        dto.setInscriptionsOuvertes(formation.isInscriptionsOuvertes());
        dto.setCertifGenerated(formation.isCertifGenerated());

        if (formation.getSeances() != null) {
            dto.setSeances(formation.getSeances().stream().map(this::mapSeanceToDTO).toList());
        }
        // Transformation pour département
        if (formation.getDepartement() != null) {
            DeptDTO deptDTO = new DeptDTO();
            deptDTO.setId(formation.getDepartement().getId());
            deptDTO.setLibelle(formation.getDepartement().getLibelle());
            dto.setDepartement1(deptDTO);
        }
        // Transformation pour UP
        if (formation.getUp() != null) {
            UpDTO upDTO = new UpDTO();
            upDTO.setId(formation.getUp().getId());
            upDTO.setLibelle(formation.getUp().getLibelle());
            dto.setUp1(upDTO);
        }
        return dto;
    }

    // Méthode pour récupérer les formations dont un animateur a l'email donné
    public List<FormationDTO> getFormationsByAnimateurEmail(String email) {
        log.info("Entrée dans getFormationsByAnimateurEmail avec l'email : {}", email);

        // 1) Récupérer toutes les formations liées à cet animateur
        List<Formation> allFormations = formationRepository.findDistinctBySeancesAnimateursMail(email);
        log.info("Nombre total de formations trouvées : {}", allFormations.size());

        // 2) Filtrer uniquement celles dont l'état est EN_COURS
        List<Formation> enCours = allFormations.stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.EN_COURS)
                .peek(f -> log.debug("→ Formation en cours ID={}, Titre={}",
                        f.getIdFormation(), f.getTitreFormation()))
                .toList();
        log.info("Nombre de formations EN_COURS : {}", enCours.size());

        // 3) Charger les collections pour éviter LazyInitializationException (optionnel)
        enCours.forEach(f -> {
            if (f.getSeances() != null) {
                f.getSeances().forEach(s -> {
                    s.getAnimateurs().size();
                    s.getParticipants().size();
                    log.debug("  • Séance ID={}, Date={}, #Anim={}, #Part={}",
                            s.getIdSeance(),
                            s.getDateSeance(),
                            s.getAnimateurs().size(),
                            s.getParticipants().size());
                });
            }
        });

        // 4) Transformer en DTO et retourner
        List<FormationDTO> dtos = enCours.stream()
                .map(this::mapFormationToDTO)
                .toList();
        log.info("Nombre de FormationDTO retournés : {}", dtos.size());
        return dtos;
    }

    // Méthode pour récupérer la liste des présences d'une séance donnée
    public List<PresenceDTO> getPresencesBySeance(Long seanceId) {
        SeanceFormation seance = seanceFormationRepository.findById(seanceId)
                .orElseThrow(() -> new IllegalArgumentException("Séance introuvable pour id " + seanceId));
        if (seance.getPresences() != null) {
            seance.getPresences().size();
        }
        return seance.getPresences().stream().map(this::mapPresenceToDTO).toList();
    }

    // Méthode de mapping pour convertir une entité Presence en PresenceDTO
    private PresenceDTO mapPresenceToDTO(Presence presence) {
        PresenceDTO dto = new PresenceDTO();
        dto.setIdParticipation(presence.getIdParticipation());
        dto.setPresence(presence.isPresence());
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
            dto.setTypeFormation(formation.getTypeFormation().toString());
            dto.setDateDebut(formation.getDateDebut());
            dto.setDateFin(formation.getDateFin());
            dto.setEtatFormation(formation.getEtatFormation().toString());
            dto.setCoutFormation(formation.getCoutFormation());
            dto.setOrganismeRefExterne(formation.getOrganismeRefExterne());
            dto.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());

            // Transformation du département associé
            if (formation.getDepartement() != null) {
                DeptDTO deptDTO = new DeptDTO();
                deptDTO.setId(formation.getDepartement().getId());
                deptDTO.setLibelle(formation.getDepartement().getLibelle());
                dto.setDepartement1(deptDTO);
            }

            // Transformation de l'UP associé
            if (formation.getUp() != null) {
                UpDTO upDTO = new UpDTO();
                upDTO.setId(formation.getUp().getId());
                upDTO.setLibelle(formation.getUp().getLibelle());
                dto.setUp1(upDTO);
            }

            // Récupération des documents associés à la formation
            List<Document> documents = documentRepository.findByFormation_IdFormation(formation.getIdFormation());
            List<DocumentDTO> documentDTOs = documents.stream()
                    .map(DocumentMapper::mapToDTO)
                    .collect(Collectors.toList());
            dto.setDocuments(documentDTOs);

            return dto;
        }).collect(Collectors.toList());
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
        // Récupération de l'entité Formation
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));
        // Mise à jour du flag inscriptionsOuvertes
        formation.setInscriptionsOuvertes(ouvert);
        // Sauvegarde de l'entité
        Formation saved = formationRepository.save(formation);
        // Conversion en DTO avant retour
        return mapFormationToDTO(saved);
    }

    public List<FormationDTO> getFormationsVisibles() {
        return formationRepository
                .findByEtatFormation(EtatFormation.VISIBLE)
                .stream()
                .map(this::mapFormationToDTO)
                .toList();
    }


    public List<FormationDTO> getFormationsParUp(String upId) {
        return formationRepository
                .findByUp_Id(upId)
                .stream()
                .filter(f -> f.getEtatFormation() == EtatFormation.VISIBLE)
                .map(this::mapFormationToDTO)
                .toList();
    }

}
