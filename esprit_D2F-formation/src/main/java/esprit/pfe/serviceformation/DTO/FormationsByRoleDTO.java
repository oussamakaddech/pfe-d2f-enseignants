package esprit.pfe.serviceformation.DTO;



import java.util.List;

public class FormationsByRoleDTO {
    private List<FormationDTO> asAnimateur;
    private List<FormationDTO> asParticipant;

    public FormationsByRoleDTO() {}

    public FormationsByRoleDTO(List<FormationDTO> asAnimateur, List<FormationDTO> asParticipant) {
        this.asAnimateur = asAnimateur;
        this.asParticipant = asParticipant;
    }

    public List<FormationDTO> getAsAnimateur() {
        return asAnimateur;
    }

    public void setAsAnimateur(List<FormationDTO> asAnimateur) {
        this.asAnimateur = asAnimateur;
    }

    public List<FormationDTO> getAsParticipant() {
        return asParticipant;
    }

    public void setAsParticipant(List<FormationDTO> asParticipant) {
        this.asParticipant = asParticipant;
    }
}
