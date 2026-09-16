package tn.esprit.d2f.competence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persistance de l'historique des imports RICE en base de données.
 * Le champ {@code tauxJson} stocke la map {domaineNom → taux} sérialisée en JSON.
 */
@Entity
@Table(name = "rice_import_logs")
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceImportLog extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    private int domainesCreated;
    private int competencesCreated;
    private int sousCompetencesCreated;
    private int savoirsCreated;
    private int affectationsCreated;
    private int enseignantsCovered;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** JSON : { "domaineNom" : tauxDouble } */
    @Column(name = "taux_json", columnDefinition = "TEXT")
    private String tauxJson;
}
