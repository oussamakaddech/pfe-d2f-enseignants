package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

@Entity
@Table(name = "savoirs")
@Data
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"sousCompetence", "competence"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Savoir {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeSavoir type;

    /** Niveau de complexité Bloom (N1=débutant … N5=expert) */
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255) DEFAULT 'N2_ELEMENTAIRE'")
    @Builder.Default
    private NiveauMaitrise niveau = NiveauMaitrise.N2_ELEMENTAIRE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sous_competence_id")
    @JsonBackReference("souscompetence-savoir")
    private SousCompetence sousCompetence;

    /** Savoir peut être lié directement à une compétence (sans passer par sous-compétence) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competence_id")
    @JsonBackReference("competence-savoir")
    private Competence competence;
}
