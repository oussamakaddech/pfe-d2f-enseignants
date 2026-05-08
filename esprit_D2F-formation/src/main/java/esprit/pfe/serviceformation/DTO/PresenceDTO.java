package esprit.pfe.serviceformation.dto;

import lombok.Data;

@Data
public class PresenceDTO {
    private Long idParticipation;
    private boolean presence;
    private String commentaire;
    private EnseignantDTO enseignant; // Facultatif : détails de l'enseignant associé
}
