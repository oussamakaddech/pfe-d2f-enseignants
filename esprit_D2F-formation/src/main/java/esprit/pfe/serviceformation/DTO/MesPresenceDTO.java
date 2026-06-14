package esprit.pfe.serviceformation.dto;

import lombok.Data;
import java.util.Date;

@Data
public class MesPresenceDTO {
    private Long idParticipation;
    private boolean present;
    private String commentaire;

    private Long seanceId;
    private Date dateSeance;
    private String heureDebut;
    private String heureFin;
    private String salle;

    private Long formationId;
    private String titreFormation;
    private String etatFormation;
}
