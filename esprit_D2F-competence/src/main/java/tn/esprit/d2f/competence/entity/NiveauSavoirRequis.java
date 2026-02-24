package tn.esprit.d2f.competence.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

/**
 * Définit les savoirs requis pour chaque niveau de compétence/sous-compétence.
 * Associe un niveau (1-5) à un savoir requis pour une compétence ou sous-compétence donnée.
 */
@Entity
@Table(name = "niveau_savoir_requis",
       uniqueConstraints = @UniqueConstraint(columnNames = {"competence_id", "sous_competence_id", "niveau", "savoir_id"}))
@Data
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"competence", "sousCompetence", "savoir"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NiveauSavoirRequis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** La compétence concernée (nullable si c'est une sous-compétence) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competence_id")
    private Competence competence;

    /** La sous-compétence concernée (nullable si c'est une compétence) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sous_competence_id")
    private SousCompetence sousCompetence;

    /** Le niveau (1 à 5) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauMaitrise niveau;

    /** Le savoir requis pour ce niveau */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "savoir_id", nullable = false)
    private Savoir savoir;

    private String description;
}
