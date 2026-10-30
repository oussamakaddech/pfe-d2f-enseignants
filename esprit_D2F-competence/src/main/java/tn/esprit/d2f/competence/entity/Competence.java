package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "competences", indexes = {
        @Index(name = "idx_competence_code", columnList = "code"),
        @Index(name = "idx_competence_domaine", columnList = "domaine_id")
})
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@ToString(exclude = {"domaine", "sousCompetences", "savoirs", "prerequisite", "upIds", "departementIds"})
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

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "prerequisite_manual", columnDefinition = "TEXT")
    private String prerequisiteManual;

    private Integer ordre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domaine_id", nullable = false)
    @JsonBackReference("domaine-competence")
    private Domaine domaine;

    /**
     * UP auxquelles cette compétence s'applique (choix multiple, optionnel).
     * Stockées sur la compétence depuis la V24 : le rattachement n'est plus
     * porté par le domaine (les colonnes historiques de `domaines` restent en
     * base pour les autres services, mais ne sont plus alimentées par l'IHM).
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "competence_ups",
            joinColumns = @JoinColumn(name = "competence_id"))
    @Column(name = "up_id", nullable = false, length = 255)
    @Builder.Default
    private Set<String> upIds = new LinkedHashSet<>();

    /** Départements auxquels cette compétence s'applique (optionnel, multiple). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "competence_departements",
            joinColumns = @JoinColumn(name = "competence_id"))
    @Column(name = "departement_id", nullable = false, length = 255)
    @Builder.Default
    private Set<String> departementIds = new LinkedHashSet<>();

    @OneToMany(mappedBy = "competence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("competence-souscompetence")
    @Builder.Default
    private List<SousCompetence> sousCompetences = new ArrayList<>();

    /** Savoirs directement rattachés à la compétence (sans sous-compétence) */
    @OneToMany(mappedBy = "competence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("competence-savoir")
    @Builder.Default
    private List<Savoir> savoirs = new ArrayList<>();

    @OneToMany(mappedBy = "competence", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CompetencePrerequisite> prerequisite = new ArrayList<>();
}
