package esprit.pfe.serviceformation.Entities;



import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inscriptions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"formation_id", "enseignant_id"}))
public class Inscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enseignant_id", nullable = false)
    private Enseignant enseignant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EtatInscription etat = EtatInscription.PENDING;

    @Column(nullable = false)
    private OffsetDateTime dateDemande = OffsetDateTime.now();
}
