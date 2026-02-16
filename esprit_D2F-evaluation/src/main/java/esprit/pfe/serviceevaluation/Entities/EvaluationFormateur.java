package esprit.pfe.serviceevaluation.Entities;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class EvaluationFormateur {

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

