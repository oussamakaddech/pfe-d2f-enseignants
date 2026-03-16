package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sous_competences", indexes = {
        @Index(name = "idx_sc_code", columnList = "code"),
    @Index(name = "idx_sc_competence", columnList = "competence_id"),
    @Index(name = "idx_sc_parent", columnList = "parent_id"),
    @Index(name = "idx_sc_niveau", columnList = "niveau")
})
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@ToString(exclude = {"competence", "parent", "enfants", "savoirs"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SousCompetence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competence_id", nullable = false)
    @JsonBackReference("competence-souscompetence")
    private Competence competence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonBackReference("souscompetence-parent")
    private SousCompetence parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("souscompetence-parent")
    @Builder.Default
    private List<SousCompetence> enfants = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private Integer niveau = 1;

    @OneToMany(mappedBy = "sousCompetence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("souscompetence-savoir")
    @Builder.Default
    private List<Savoir> savoirs = new ArrayList<>();
}
