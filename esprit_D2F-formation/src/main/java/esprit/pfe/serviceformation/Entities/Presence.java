package esprit.pfe.serviceformation.Entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "presences")
public class Presence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idParticipation;

    private boolean presence;
    private String commentaire;

    // Relation vers la séance à laquelle la présence est associée
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seance_id")
    private SeanceFormation seanceFormation;

    // Relation vers l'enseignant qui est présent à la séance
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enseignant_id")
    private Enseignant enseignant;
}
