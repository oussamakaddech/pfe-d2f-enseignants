package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les indicateurs de présence (Task 4).
 * Contient: attendance_rate, min_per_session, late_count, absent_count, justification_rate
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceIndicatorDTO {
    
    private Long trainingId;
    private String participantId;
    
    // Taux de présence en pourcentage (0-100)
    // Formule réglementaire : minutes suivies / minutes prévues × 100
    private Double attendanceRate;

    // Nombre moyen de minutes par séance suivie
    private Double minPerSession;

    // Nombre d'arrivées tardives
    private Integer lateCount;

    // Nombre d'absences (ABSENT + EXCUSED)
    private Integer absentCount;

    // Nombre d'absences justifiées (EXCUSED)
    private Integer excusedCount;

    // Pourcentage d'absences justifiées (parmi les absences)
    private Double justificationRate;

    // Total de séances
    private Integer totalSeances;

    // Nombre de séances suivies (PRESENT + LATE)
    private Integer presentCount;

    // ── Indicateurs réglementaires (basés sur le temps réellement suivi) ──

    // Minutes prévues (somme des durées de séances planifiées)
    private Double expectedMinutes;

    // Minutes réellement suivies (arrivée → départ, bornées par la séance)
    private Double trackedMinutes;

    // Taux de retard : séances avec arrivée tardive / total séances
    private Double lateRate;

    // Taux d'absence : (ABSENT + EXCUSED) / total séances
    private Double absenceRate;

    // Taux d'absence justifiée : EXCUSED / total séances
    private Double excusedRate;

    // Taux de complétion : séances suivies (PRESENT + LATE) / total séances
    private Double completionRate;
}
