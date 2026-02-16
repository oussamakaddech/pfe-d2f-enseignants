package esprit.pfe.serviceevaluation.DTO;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EvaluationFormateurDTO {
    private Long idEvalParticipant;
    private String enseignantId; // type String si l’ID enseignant est String
    private Long formationId;    // type Long si l’ID formation est Long
    private float note;          // par exemple 0
    private boolean satisfaisant;
    private String commentaire;
    // + getters/setters
}
