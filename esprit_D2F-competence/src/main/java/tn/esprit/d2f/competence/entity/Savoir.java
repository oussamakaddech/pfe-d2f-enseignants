package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

@Entity
@Table(name = "savoirs")
@Data
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sous_competence_id", nullable = false)
    @JsonBackReference("souscompetence-savoir")
    private SousCompetence sousCompetence;
}
