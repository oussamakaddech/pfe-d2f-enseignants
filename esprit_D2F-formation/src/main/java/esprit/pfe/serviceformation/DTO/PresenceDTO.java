package esprit.pfe.serviceformation.dto;

import lombok.Data;

@Data
public class PresenceDTO {
    private Long idParticipation;
    private boolean present;
    private String commentaire;
    private EnseignantDTO enseignant; // Facultatif : dÃ©tails de l'enseignant associÃ©

    // Adding missing fields that are being used in tests
    private String enseignantId;
    private String nom;
    private String prenom;
}
