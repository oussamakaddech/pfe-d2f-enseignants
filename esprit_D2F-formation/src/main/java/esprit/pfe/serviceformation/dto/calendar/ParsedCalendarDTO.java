package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Résultat du parsing brut d'un fichier calendrier, avant persistance.
 * Utilisé tel quel par l'aperçu ({@code /import/preview}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedCalendarDTO {

    @Builder.Default
    private List<ParsedSessionDTO> sessions = new ArrayList<>();

    @Builder.Default
    private List<ParsedParticipantDTO> participants = new ArrayList<>();

    @Builder.Default
    private List<ImportRowErrorDTO> errors = new ArrayList<>();
}
