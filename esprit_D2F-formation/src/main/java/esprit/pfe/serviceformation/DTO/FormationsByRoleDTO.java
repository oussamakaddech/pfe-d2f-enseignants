package esprit.pfe.serviceformation.dto;

import java.util.List;

public class FormationsByRoleDTO {
    private List<FormationResponseDTO> asAnimateur;
    private List<FormationResponseDTO> asParticipant;

    public FormationsByRoleDTO() {}

    public FormationsByRoleDTO(List<FormationResponseDTO> asAnimateur, List<FormationResponseDTO> asParticipant) {
        this.asAnimateur = asAnimateur;
        this.asParticipant = asParticipant;
    }

    public List<FormationResponseDTO> getAsAnimateur() {
        return asAnimateur;
    }

    public void setAsAnimateur(List<FormationResponseDTO> asAnimateur) {
        this.asAnimateur = asAnimateur;
    }

    public List<FormationResponseDTO> getAsParticipant() {
        return asParticipant;
    }

    public void setAsParticipant(List<FormationResponseDTO> asParticipant) {
        this.asParticipant = asParticipant;
    }
}
