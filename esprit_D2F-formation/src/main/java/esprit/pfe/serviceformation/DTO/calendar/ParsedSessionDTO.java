package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Une ligne de planning extraite de la feuille principale du calendrier.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedSessionDTO {

    private String formationName;
    private String trainerName;
    private String room;
    private String status;

    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;

    private Integer sessionNumber;
    private Integer totalSessions;

    /** Numéro de ligne (1-based) dans le fichier source — pour le rapport d'erreurs. */
    private int sourceRow;
}
