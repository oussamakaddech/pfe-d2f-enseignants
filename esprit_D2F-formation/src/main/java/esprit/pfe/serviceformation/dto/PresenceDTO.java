package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.PresenceStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class PresenceDTO {
    private Long idParticipation;
    private boolean present;
    private PresenceStatus status;
    private LocalTime arrivalTime;
    private LocalTime departureTime;
    private String justification;
    private String commentaire;
    private String recordedBy;
    private LocalDateTime recordedAt;
    private EnseignantDTO enseignant; // Facultatif : dÃ©tails de l'enseignant associÃ©

    // Adding missing fields that are being used in tests
    private String enseignantId;
    private String nom;
    private String prenom;
}
