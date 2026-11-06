package esprit.pfe.serviceformation.service;

import esprit.pfe.serviceformation.dto.PresenceIndicatorDTO;
import esprit.pfe.serviceformation.entities.Presence;
import esprit.pfe.serviceformation.entities.PresenceStatus;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service pour calculer les indicateurs de présence.
 * Fournit :
 * - attendance_rate : taux de présence = minutes suivies / minutes prévues × 100
 * - min_per_session : moyenne de minutes réellement suivies par séance
 * - late_count / late_rate : arrivées tardives (LATE)
 * - absent_count / absence_rate : absences (ABSENT + EXCUSED)
 * - excused_count / excused_rate : absences justifiées (EXCUSED)
 * - justification_rate : % d'absences justifiées parmi les absences
 * - completion_rate : séances suivies (PRESENT + LATE) / total séances
 * - expected_minutes / tracked_minutes : minutes prévues et réellement suivies
 */
@Service
@RequiredArgsConstructor
public class PresenceIndicatorService {

    private final PresenceRepository presenceRepository;
    private final SeanceFormationRepository seanceFormationRepository;

    /**
     * Calcule les indicateurs de présence pour un participant à une formation.
     * 
     * @param trainingId L'ID de la formation
     * @param participantId L'ID du participant
     * @return PresenceIndicatorDTO avec tous les indicateurs calculés
     */
    public PresenceIndicatorDTO calculatePresenceIndicators(Long trainingId, String participantId) {
        List<SeanceFormation> seances = seanceFormationRepository.findByFormationId(trainingId);
        List<Presence> presences = presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation(
                participantId, trainingId);

        if (seances.isEmpty()) {
            return emptyIndicators(trainingId, participantId);
        }

        int totalSeances = seances.size();
        int presentCount = 0;
        int lateCount = 0;
        int absentCount = 0;
        int excusedCount = 0;
        int justifiedAbsentCount = 0;
        double expectedMinutes = 0.0;
        double trackedMinutes = 0.0;

        for (SeanceFormation seance : seances) {
            expectedMinutes += plannedSessionMinutes(seance);
            Presence presence = presences.stream()
                    .filter(p -> p.getSeanceFormation() != null
                            && seance.getIdSeance().equals(p.getSeanceFormation().getIdSeance()))
                    .findFirst()
                    .orElse(null);
            PresenceStatus status = effectiveStatus(presence);
            switch (status) {
                case PRESENT -> {
                    presentCount++;
                    trackedMinutes += trackedSessionMinutes(seance, presence);
                }
                case LATE -> {
                    presentCount++;
                    lateCount++;
                    trackedMinutes += trackedSessionMinutes(seance, presence);
                }
                case ABSENT -> absentCount++;
                case EXCUSED -> {
                    excusedCount++;
                    absentCount++;
                    if (presence.getJustification() != null && !presence.getJustification().isBlank()) {
                        justifiedAbsentCount++;
                    }
                }
            }
        }

        // Formule réglementaire : minutes suivies / minutes prévues × 100
        double attendanceRate = expectedMinutes > 0 ? (trackedMinutes * 100.0) / expectedMinutes : 0.0;
        double lateRate = pct(lateCount, totalSeances);
        double absenceRate = pct(absentCount, totalSeances);
        double excusedRate = pct(excusedCount, totalSeances);
        double completionRate = pct(presentCount, totalSeances);
        double justificationRate = absentCount > 0 ? (justifiedAbsentCount * 100.0) / absentCount : 0.0;
        double minPerSession = presentCount > 0 ? trackedMinutes / presentCount : 0.0;

        return PresenceIndicatorDTO.builder()
                .trainingId(trainingId)
                .participantId(participantId)
                .attendanceRate(attendanceRate)
                .minPerSession(minPerSession)
                .lateCount(lateCount)
                .absentCount(absentCount)
                .excusedCount(excusedCount)
                .justificationRate(justificationRate)
                .totalSeances(totalSeances)
                .presentCount(presentCount)
                .expectedMinutes(expectedMinutes)
                .trackedMinutes(trackedMinutes)
                .lateRate(lateRate)
                .absenceRate(absenceRate)
                .excusedRate(excusedRate)
                .completionRate(completionRate)
                .build();
    }

    private PresenceIndicatorDTO emptyIndicators(Long trainingId, String participantId) {
        return PresenceIndicatorDTO.builder()
                .trainingId(trainingId)
                .participantId(participantId)
                .attendanceRate(0.0)
                .minPerSession(0.0)
                .lateCount(0)
                .absentCount(0)
                .excusedCount(0)
                .justificationRate(0.0)
                .totalSeances(0)
                .presentCount(0)
                .expectedMinutes(0.0)
                .trackedMinutes(0.0)
                .lateRate(0.0)
                .absenceRate(0.0)
                .excusedRate(0.0)
                .completionRate(0.0)
                .build();
    }

    /** Statut effectif : dérive ABSENT si aucune présence enregistrée. */
    private PresenceStatus effectiveStatus(Presence presence) {
        if (presence == null) {
            return PresenceStatus.ABSENT;
        }
        if (presence.getStatus() != null) {
            return presence.getStatus();
        }
        return presence.isPresent() ? PresenceStatus.PRESENT : PresenceStatus.ABSENT;
    }

    private double pct(int count, int total) {
        return total > 0 ? (count * 100.0) / total : 0.0;
    }

    /**
     * Minutes prévues pour une séance (heureDebut → heureFin).
     */
    private double plannedSessionMinutes(SeanceFormation seance) {
        if (seance.getHeureDebut() == null || seance.getHeureFin() == null) {
            return 0.0;
        }
        long minutes = java.time.temporal.ChronoUnit.MINUTES.between(
                seance.getHeureDebut(), seance.getHeureFin());
        return Math.max(0, minutes);
    }

    /**
     * Minutes réellement suivies pour une séance : de l'heure d'arrivée
     * (défaut : début de séance) à l'heure de départ (défaut : fin de séance),
     * bornées par la fenêtre de la séance.
     */
    private double trackedSessionMinutes(SeanceFormation seance, Presence presence) {
        LocalTime plannedStart = seance.getHeureDebut();
        LocalTime plannedEnd = seance.getHeureFin();
        if (plannedStart == null || plannedEnd == null) {
            return plannedSessionMinutes(seance);
        }
        LocalTime from = plannedStart;
        if (presence != null && presence.getArrivalTime() != null
                && presence.getArrivalTime().isAfter(plannedStart)) {
            from = presence.getArrivalTime();
        }
        LocalTime to = plannedEnd;
        if (presence != null && presence.getDepartureTime() != null
                && presence.getDepartureTime().isBefore(plannedEnd)) {
            to = presence.getDepartureTime();
        }
        long minutes = java.time.temporal.ChronoUnit.MINUTES.between(from, to);
        return Math.max(0, minutes);
    }

    /**
     * Calcule les indicateurs pour tous les participants d'une formation.
     */
    public Map<String, PresenceIndicatorDTO> calculateAllParticipantIndicators(Long trainingId) {
        List<Presence> allPresences = presenceRepository.findBySeanceFormation_Formation_IdFormation(trainingId);
        
        return allPresences.stream()
                .map(p -> p.getEnseignant().getId())
                .distinct()
                .collect(Collectors.toMap(
                        participantId -> participantId,
                        participantId -> calculatePresenceIndicators(trainingId, participantId)
                ));
    }

    /**
     * Vérifie si un participant atteint le taux de présence minimum (défaut: 80%).
     */
    public boolean meetsAttendanceThreshold(Long trainingId, String participantId, double threshold) {
        PresenceIndicatorDTO indicators = calculatePresenceIndicators(trainingId, participantId);
        return indicators.getAttendanceRate() >= threshold;
    }
}
