package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.sql.Time;
import java.time.*;
import java.util.Date;
import java.util.*;

/**
 * Classe helper pour extraire la logique complexe de FormationWorkflowService
 * et réduire la complexité cognitive des méthodes principales.
 */
@Component
@RequiredArgsConstructor
public class FormationWorkflowServiceHelper {

    public static final String TIMEZONE_TUNIS = "Africa/Tunis";
    private final SeanceFormationRepository seanceFormationRepository;
    private final EnseignantRepository enseignantRepository;
    private final PresenceRepository presenceRepository;
    private final DeptRepository departementRepository;
    private final UpRepository upRepository;

    /**
     * Crée les séances de formation avec validation des conflits
     */
    public void initFormationFromRequest(Formation formation, FormationWorkflowRequest request) {
        formation.setIdBesoinFormation(request.getIdBesoinFormation());
        formation.setTypeBesoin(request.getTypeBesoin());
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

        if (request.getUpId() != null && !request.getUpId().isBlank()) {
            formation.setUp(upRepository.findById(request.getUpId()).orElse(null));
        }

        if (request.getDepartementId() != null && !request.getDepartementId().isBlank()) {
            formation.setDepartement(departementRepository.findById(request.getDepartementId()).orElse(null));
        }

        // Animateurs au niveau de la formation
        if (request.getAnimateursIds() != null && !request.getAnimateursIds().isEmpty()) {
            formation.setAnimateurs(request.getAnimateursIds().stream()
                    .map(id -> enseignantRepository.findById(id).orElse(null))
                    .filter(Objects::nonNull)
                    .toList());
        } else {
            formation.setAnimateurs(new ArrayList<>());
        }
    }

    public List<SeanceFormation> createSeancesForFormation(
            Formation formation,
            List<FormationWorkflowRequest.SeanceRequest> seanceReqs,
            List<String> partIds) {

        List<Enseignant> participants = partIds.isEmpty() ? List.of() : enseignantRepository.findAllById(partIds);
        List<SeanceFormation> seances = new ArrayList<>();

        for (FormationWorkflowRequest.SeanceRequest sr : seanceReqs) {
            SeanceFormation sf = createSeance(formation, sr, partIds, participants);
            seances.add(sf);
        }

        return seances;
    }

    /**
     * Crée une séance individuelle avec toutes les validations
     */
    private SeanceFormation createSeance(
            Formation formation,
            FormationWorkflowRequest.SeanceRequest sr,
            List<String> partIds,
            List<Enseignant> participants) {

        if (sr.getDateSeance() == null) {
            throw new IllegalArgumentException("La date de la séance ne peut pas être null");
        }

        if (formation.getDateDebut() == null || formation.getDateFin() == null) {
            throw new IllegalArgumentException("Les dates de début et fin de la formation sont obligatoires");
        }

        if (sr.getDateSeance().before(formation.getDateDebut()) ||
                sr.getDateSeance().after(formation.getDateFin())) {
            throw new IllegalStateException("Seance hors plage : " + sr.getDateSeance());
        }

        Time hd = parseTime(sr.getHeureDebut());
        Time hf = parseTime(sr.getHeureFin());

        validateEnseignantConflicts(sr, hd, hf, partIds, formation.getIdFormation());
        validateSalleConflict(sr, hd, hf);

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

        List<String> seanceAnimIds = Optional.ofNullable(sr.getAnimateursIds()).orElse(Collections.emptyList());
        sf.setAnimateurs(seanceAnimIds.stream().map(id -> enseignantRepository.findById(id).orElse(null)).filter(Objects::nonNull).toList());
        sf.setParticipants(participants);

        return sf;
    }

    /**
     * Valide les conflits d'enseignants pour une séance
     */
    private void validateEnseignantConflicts(
            FormationWorkflowRequest.SeanceRequest sr,
            Time hd,
            Time hf,
            List<String> partIds,
            Long formationId) {

        List<String> seanceAnimIds = Optional.ofNullable(sr.getAnimateursIds())
                .orElse(Collections.emptyList());

        for (String aid : seanceAnimIds) {
            ensureNoConflict(aid, sr.getDateSeance(), hd, hf, true, null, formationId);
        }

        for (String pid : partIds) {
            ensureNoConflict(pid, sr.getDateSeance(), hd, hf, false, null, formationId);
        }
    }

    /**
     * Valide les conflits de salle pour une séance
     */
    private void validateSalleConflict(
            FormationWorkflowRequest.SeanceRequest sr,
            Time hd,
            Time hf) {

        if (sr.getSalle() != null && !sr.getSalle().isBlank() && 
            seanceFormationRepository.existsSalleConflict(sr.getSalle(), sr.getDateSeance(), hd, hf)) {
            throw new IllegalStateException(
                    "Conflit de salle : " + sr.getSalle() + " est deja reservee le "
                            + sr.getDateSeance() + " de " + sr.getHeureDebut() + " a " + sr.getHeureFin());
        }
    }

    /**
     * Crée les présences pour toutes les séances
     */
    @SuppressWarnings("java:S3776") // builds the cross-product of seances × enseignants × participants — flattening would replicate the same iteration depth in helpers
    public List<Presence> createPresencesForSeances(
            List<SeanceFormation> seances) {

        List<Presence> allPresences = new ArrayList<>();
        Set<String> alreadyAdded = new HashSet<>();

        for (SeanceFormation sf : seances) {
            // Presences pour les animateurs
            if (sf.getAnimateurs() != null) {
                for (Enseignant anim : sf.getAnimateurs()) {
                    String key = sf.getIdSeance() + "-" + anim.getId();
                    if (alreadyAdded.add(key)) {
                        Presence p = new Presence();
                        p.setSeanceFormation(sf);
                        p.setEnseignant(anim);
                        p.setPresent(false);
                        p.setCommentaire("Presence animateur a valider");
                        allPresences.add(p);
                    }
                }
            }
            // Presences pour les participants
            if (sf.getParticipants() != null) {
                for (Enseignant pt : sf.getParticipants()) {
                    String key = sf.getIdSeance() + "-" + pt.getId();
                    if (alreadyAdded.add(key)) {
                        Presence p = new Presence();
                        p.setSeanceFormation(sf);
                        p.setEnseignant(pt);
                        p.setPresent(false);
                        p.setCommentaire("Presence a valider");
                        allPresences.add(p);
                    }
                }
            }
        }

        return allPresences;
    }

    /**
     * Crée les DTOs d'évaluation pour tous les enseignants
     */
    public List<EvaluationFormateurDTO> createEvaluationDTOs(
            List<SeanceFormation> seances,
            Formation formation) {

        Set<String> seen = new HashSet<>();
        List<EvaluationFormateurDTO> evaluationDTOs = new ArrayList<>();

        for (SeanceFormation sf : seances) {
            addEvaluationDTOsForSeance(sf, formation, seen, evaluationDTOs);
        }

        return evaluationDTOs;
    }

    /**
     * Ajoute les DTOs d'évaluation pour une séance
     */
    private void addEvaluationDTOsForSeance(
            SeanceFormation sf,
            Formation formation,
            Set<String> seen,
            List<EvaluationFormateurDTO> evaluationDTOs) {

        // Ajouter les participants
        if (sf.getParticipants() != null) {
            for (Enseignant pt : sf.getParticipants()) {
                String key = pt.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    evaluationDTOs.add(createEvaluationDTO(pt, formation.getIdFormation()));
                }
            }
        }

        // Ajouter les animateurs
        if (sf.getAnimateurs() != null) {
            for (Enseignant anim : sf.getAnimateurs()) {
                String key = anim.getId() + "-" + formation.getIdFormation();
                if (!seen.contains(key)) {
                    seen.add(key);
                    evaluationDTOs.add(createEvaluationDTO(anim, formation.getIdFormation()));
                }
            }
        }
    }

    /**
     * Crée un DTO d'évaluation
     */
    public EvaluationFormateurDTO createEvaluationDTO(Enseignant enseignant, Long formationId) {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setEnseignantId(enseignant.getId());
        dto.setFormationId(formationId);
        dto.setNote(0f);
        dto.setSatisfaisant(false);
        dto.setCommentaire("N/A");
        return dto;
    }

    /**
     * Parse une chaîne de temps en objet Time
     */
    public Time parseTime(String heure) {
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

    /**
     * Vérifie l'absence de conflit pour un utilisateur sur une plage horaire donnée
     */
    public void ensureNoConflict(
            String userId,
            Date date,
            Time debut,
            Time fin,
            boolean isAnimateur,
            Long ignoreSeanceId,
            Long ignoreFormationId
    ) {
        boolean existsConflict = (ignoreSeanceId == null)
                ? seanceFormationRepository.existsSeanceConflict(userId, date, debut, fin)
                : seanceFormationRepository.existsSeanceConflictIgnoringSelf(userId, date, debut, fin, ignoreSeanceId);

        if (!existsConflict) {
            return;
        }

        List<SeanceFormation> existantes = isAnimateur
                ? seanceFormationRepository.findByAnimateurAndDate(userId, date)
                : seanceFormationRepository.findByParticipantAndDate(userId, date);

        SeanceFormation conflit = existantes.stream()
                .filter(s -> ignoreSeanceId == null || !s.getIdSeance().equals(ignoreSeanceId))
                .filter(s -> ignoreFormationId == null || !s.getFormation().getIdFormation().equals(ignoreFormationId))
                .filter(s -> s.getHeureDebut().before(fin) && s.getHeureFin().after(debut))
                .findFirst()
                .orElse(null);

        if (conflit == null) {
            return;
        }

        Enseignant user = enseignantRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable : " + userId));

        String role = isAnimateur ? "animateur" : "participant";
        String userInfo = user.getNom() + " " + user.getPrenom() + " (" + user.getMail() + ")";
        String formationTitre = conflit.getFormation().getTitreFormation();

        throw new IllegalStateException(
                String.format("Conflit %s %s : seance le %tF de %tR a %tR pour la formation %s",
                        role, userInfo, conflit.getDateSeance(),
                        conflit.getHeureDebut(), conflit.getHeureFin(), formationTitre));
    }

    /**
     * Convertit une date et une heure en OffsetDateTime pour Microsoft Graph
     */
    public OffsetDateTime convertToOffsetDateTime(Date dateUtil, Time time) {
        if (dateUtil == null) {
            throw new IllegalArgumentException("La date de la séance ne peut pas être null");
        }
        if (time == null) {
            throw new IllegalArgumentException("L'heure de la séance ne peut pas être null");
        }
        LocalDate localDate = dateUtil.toInstant()
                .atZone(ZoneId.of(TIMEZONE_TUNIS))
                .toLocalDate();
        LocalTime localTime = time.toLocalTime();
        ZonedDateTime zonedDateTime = ZonedDateTime.of(localDate, localTime, ZoneId.of(TIMEZONE_TUNIS));
        return zonedDateTime.toOffsetDateTime();
    }
}
