package tn.esprit.d2f.competence.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitriseConverter;

import java.time.LocalDate;
import java.time.ZoneId;

@Entity
@Table(name = "enseignant_competences",
       uniqueConstraints = @UniqueConstraint(columnNames = {"enseignant_id", "savoir_id"}),
       indexes = {
           @Index(name = "idx_ec_enseignant", columnList = "enseignant_id"),
           @Index(name = "idx_ec_savoir",     columnList = "savoir_id")
       })
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@ToString(exclude = "savoir")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnseignantCompetence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enseignant_id", nullable = false)
    private String enseignantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "savoir_id", nullable = false)
    private Savoir savoir;

    @Convert(converter = NiveauMaitriseConverter.class)
    @Column(nullable = false)
    private NiveauMaitrise niveau;

    private LocalDate dateAcquisition;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @PrePersist
    public void prePersist() {
        if (dateAcquisition == null) {
            dateAcquisition = LocalDate.now(ZoneId.systemDefault());
        }
    }
}
