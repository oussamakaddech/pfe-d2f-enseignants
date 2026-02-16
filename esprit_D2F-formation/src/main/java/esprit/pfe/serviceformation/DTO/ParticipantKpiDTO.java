package esprit.pfe.serviceformation.DTO;


import lombok.Data;

@Data
public class ParticipantKpiDTO {
    private Long formationId;
    private String titreFormation;
    private long nombreParticipantsTotal;
    private long nombreParticipantsPresent;
    private double tauxParticipation;
}

