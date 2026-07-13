package esprit.pfe.serviceformation.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class MesPresenceDTO {
    private Long idParticipation;
    private boolean present;
    private String commentaire;

    private Long seanceId;
    private LocalDate dateSeance;
    private String heureDebut;
    private String heureFin;
    private String salle;

    private Long formationId;
    private String titreFormation;
    private String etatFormation;
}
