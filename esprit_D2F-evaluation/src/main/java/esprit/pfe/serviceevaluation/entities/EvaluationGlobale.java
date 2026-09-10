package esprit.pfe.serviceevaluation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@SQLDelete(sql = "UPDATE evaluation.evaluation_globale SET deleted_at = NOW() WHERE id_eval_globale = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
@Table(name = "evaluation_globale",
        uniqueConstraints = @UniqueConstraint(columnNames = {"formationId"}))
public class EvaluationGlobale extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idEvalGlobale;

    @Column(nullable = false)
    private Long formationId;

    /** Enseignant / formateur évalué (identifiant format ENS###, autre service). */
    @Column(name = "enseignant_id")
    private String enseignantId;

    @Column(length = 3000, nullable = true)
    private String commentaireGeneral;

    @Column(nullable = true)
    private LocalDate dateEvaluation;

    @Column(nullable = true)
    private Float noteGlobale;

    @Column(length = 100, nullable = true)
    private String recommandation;

    @Column(name = "last_refresh_date")
    private java.time.OffsetDateTime lastRefreshDate;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}