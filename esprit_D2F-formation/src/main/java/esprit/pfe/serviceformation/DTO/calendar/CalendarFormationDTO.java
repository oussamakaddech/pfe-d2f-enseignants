package esprit.pfe.serviceformation.dto.calendar;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Vue calendrier synthétique d'une formation (liste paginée et détail).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarFormationDTO {

    private Long idFormation;
    private String titre;
    private String etat;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String salle;
    private String responsable;
    private long sessionsCount;
    private long participantsCount;
}
