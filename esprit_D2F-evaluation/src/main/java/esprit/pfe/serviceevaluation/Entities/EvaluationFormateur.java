package esprit.pfe.serviceevaluation.entities;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "evaluation_formateur")
public class EvaluationFormateur extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idEvalParticipant;

    private float note;
    private boolean satisfaisant;
    private String commentaire;

    // Identifiants de l'enseignant et de la formation (autres microservices)
    private String enseignantId;  // Au lieu de Long

    private Long formationId;




}

