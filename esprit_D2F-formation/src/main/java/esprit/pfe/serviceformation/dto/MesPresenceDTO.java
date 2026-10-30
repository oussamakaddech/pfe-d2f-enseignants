package esprit.pfe.serviceformation.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import esprit.pfe.serviceformation.entities.PresenceStatus;

@Data
public class MesPresenceDTO {
    private Long idParticipation;
    private boolean present;
    private PresenceStatus status;
    private LocalTime arrivalTime;
    private LocalTime departureTime;
    private String justification;
    private String commentaire;
    private String recordedBy;
    private LocalDateTime recordedAt;

    private Long seanceId;
    private LocalDate dateSeance;
    private String heureDebut;
    private String heureFin;
    private String salle;

    private Long formationId;
    private String titreFormation;
    private String etatFormation;
}
