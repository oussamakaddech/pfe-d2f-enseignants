package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.time.ZoneId;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inscriptions", uniqueConstraints = @UniqueConstraint(columnNames = { "formation_id", "enseignant_id" }))
public class Inscription extends BaseAuditEntity {
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
    private OffsetDateTime dateDemande = OffsetDateTime.now(ZoneId.systemDefault());

    /**
     * Date du dernier traitement de la demande (approbation ou rejet).
     * {@code null} tant que l'inscription est en attente. Renseigne la timeline
     * d'historique côté frontend (P3 - F7).
     */
    @Column
    private OffsetDateTime dateTraitement;

    /** Motif de rejet saisi par l'administrateur (optionnel, persistant). */
    @Column(length = 500)
    private String motif;
}
