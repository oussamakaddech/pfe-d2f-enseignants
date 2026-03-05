package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "competences", indexes = {
        @Index(name = "idx_competence_code", columnList = "code"),
        @Index(name = "idx_competence_domaine", columnList = "domaine_id")
})
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@ToString(exclude = {"domaine", "sousCompetences", "savoirs"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Competence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    private String description;

    private Integer ordre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domaine_id", nullable = false)
    @JsonBackReference("domaine-competence")
    private Domaine domaine;

    @OneToMany(mappedBy = "competence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("competence-souscompetence")
    @Builder.Default
    private List<SousCompetence> sousCompetences = new ArrayList<>();

    /** Savoirs directement rattachés à la compétence (sans sous-compétence) */
    @OneToMany(mappedBy = "competence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("competence-savoir")
    @Builder.Default
    private List<Savoir> savoirs = new ArrayList<>();
}
