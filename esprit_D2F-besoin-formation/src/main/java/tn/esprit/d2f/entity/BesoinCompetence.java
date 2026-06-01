package tn.esprit.d2f.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "besoin_competences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BesoinCompetence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "besoin_id", nullable = false)
    private Long besoinId;

    @Column(name = "domaine_id")
    private Long domaineId;

    @Column(name = "competence_id")
    private Long competenceId;

    @Column(name = "competence_nom")
    private String competenceNom;

    @Column(name = "savoir_id")
    private Long savoirId;

    @Column(name = "savoir_nom")
    private String savoirNom;

    @Column(name = "sous_competence_id")
    private Long sousCompetenceId;
}
