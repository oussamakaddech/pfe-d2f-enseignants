package esprit.pfe.serviceformation.dto;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EvaluationFormateurDTO {
    private String enseignantId;

    private Long formationId;

    private float note;
    private boolean satisfaisant;
    private String commentaire;


}
