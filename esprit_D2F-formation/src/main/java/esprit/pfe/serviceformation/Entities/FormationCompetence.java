package esprit.pfe.serviceformation.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Liaison entre une formation et les compétences / savoirs ciblés.
 * Permet de définir les niveaux prérequis et visés pour chaque compétence.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "formation_competences")
public class FormationCompetence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;

    /** ID du domaine de compétence (référence vers le service competence) */
    @Column(name = "domaine_id", nullable = true)
    private Long domaineId;

    /** ID de la compétence ciblée */
    @Column(name = "competence_id", nullable = false)
    private Long competenceId;

    /** Nom de la compétence (dénormalisé pour affichage rapide) */
    @Column(name = "competence_nom", length = 255, nullable = true)
    private String competenceNom;

    /** ID de la sous-compétence (optionnel) */
    @Column(name = "sous_competence_id", nullable = true)
    private Long sousCompetenceId;

    /** Nom de la sous-compétence (dénormalisé) */
    @Column(name = "sous_competence_nom", length = 255, nullable = true)
    private String sousCompetenceNom;

    /** ID du savoir visé (optionnel, granularité fine) */
    @Column(name = "savoir_id", nullable = true)
    private Long savoirId;

    /** Nom du savoir (dénormalisé) */
    @Column(name = "savoir_nom", length = 255, nullable = true)
    private String savoirNom;

    /** Type de savoir : THEORIQUE ou PRATIQUE */
    @Column(name = "savoir_type", length = 20, nullable = true)
    private String savoirType;

    /** Niveau prérequis pour cette compétence (1-5) */
    @Column(name = "niveau_prerequis", nullable = true)
    private Integer niveauPrerequis;

    /** Niveau visé après la formation (1-5) */
    @Column(name = "niveau_vise", nullable = true)
    private Integer niveauVise;
}