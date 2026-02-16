package esprit.pfe.serviceevaluation.DTO;



import lombok.Getter;
import lombok.Setter;

// DTO qui contient les infos de l'évaluation + les infos enseignant
@Getter
@Setter
public class EvaluationEnseignantDTO {
    // Champs relatifs à l'évaluation
    private Long idEvalParticipant;
    private float note;
    private boolean satisfaisant;
    private String commentaire;

    // Infos de l'enseignant
    // Selon votre microservice formation-service,
    // vous pouvez y inclure nom, prenom, email, dept, up, etc.
    private String enseignantId;
    private String nom;
    private String prenom;
    private String mail;
    private String type;
    private String deptLibelle;  // si dispo
    private String upLibelle;    // si dispo

    // Éventuellement, on peut mettre la formationId ou d'autres infos
    private Long formationId;
}
