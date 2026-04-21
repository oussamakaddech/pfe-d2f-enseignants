package esprit.pfe.serviceevaluation.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "evaluation_globale",
        uniqueConstraints = @UniqueConstraint(columnNames = {"formationId"}))
public class EvaluationGlobale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idEvalGlobale;

    @Column(nullable = false)
    private Long formationId;

    @Column(length = 3000, nullable = true)
    private String commentaireGeneral;

    @Temporal(TemporalType.DATE)
    @Column(nullable = true)
    private Date dateEvaluation;

    @Column(nullable = true)
    private Float noteGlobale;

    @Column(length = 100, nullable = true)
    private String recommandation;
}