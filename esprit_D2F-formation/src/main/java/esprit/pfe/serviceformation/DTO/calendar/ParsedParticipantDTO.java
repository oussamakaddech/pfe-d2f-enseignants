package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Un participant (e-mail) extrait d'une section « participants » du calendrier,
 * rattaché au titre de formation servant d'en-tête de section.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedParticipantDTO {

    private String formationName;
    private String email;
    private int sourceRow;
}
