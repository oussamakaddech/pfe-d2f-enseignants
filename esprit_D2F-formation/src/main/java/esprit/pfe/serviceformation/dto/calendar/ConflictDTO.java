package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Décrit un conflit unitaire détecté dans le calendrier.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDTO {

    /** ROOM_OVERLAP, DUPLICATE_FORMATION ou SESSION_NUMBERING. */
    private String type;

    private String salle;
    private String dateSeance;
    private String heureDebut;
    private String heureFin;

    private Long seanceId;
    private Long otherSeanceId;

    /** Message lisible décrivant le conflit. */
    private String detail;
}
