package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Participant d'une formation, vue calendrier.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarParticipantDTO {

    private String email;
    private boolean matchedEnseignant;
}
