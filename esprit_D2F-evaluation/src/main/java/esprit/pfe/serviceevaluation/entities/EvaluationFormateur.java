package esprit.pfe.serviceevaluation.entities;


import jakarta.persistence.Column;
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

    // ── Critères structurés : Évaluation du formateur (échelle 0-5) ──
    /** Maîtrise du sujet. */
    @Column(name = "maitrise_sujet")
    private Float maitriseSujet;
    /** Clarté des explications. */
    @Column(name = "clarte")
    private Float clarte;
    /** Pédagogie et didactique. */
    @Column(name = "pedagogie")
    private Float pedagogie;
    /** Interaction avec les participants. */
    @Column(name = "interaction")
    private Float interaction;
    /** Gestion du temps. */
    @Column(name = "gestion_temps")
    private Float gestionTemps;

    // Identifiants de l'enseignant et de la formation (autres microservices)
    private String enseignantId;  // Au lieu de Long

    private Long formationId;




}

