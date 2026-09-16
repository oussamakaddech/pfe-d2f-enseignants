package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationEnseignantDTO {
    // Champs relatifs à l'évaluation
    private Long idEvalParticipant;
    private float note;
    private boolean satisfaisant;
    private String commentaire;

    // Infos de l'enseignant
    private String enseignantId;
    private String nom;
    private String prenom;
    private String mail;
    private String type;
    private String deptLibelle;
    private String upLibelle;

    // Éventuellement, on peut mettre la formationId ou d'autres infos
    private Long formationId;
}
