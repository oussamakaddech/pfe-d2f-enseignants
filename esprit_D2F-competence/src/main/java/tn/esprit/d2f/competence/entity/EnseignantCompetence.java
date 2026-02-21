package tn.esprit.d2f.competence.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDate;

@Entity
@Table(name = "enseignant_competences",
       uniqueConstraints = @UniqueConstraint(columnNames = {"enseignant_id", "savoir_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnseignantCompetence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enseignant_id", nullable = false)
    private String enseignantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "savoir_id", nullable = false)
    private Savoir savoir;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauMaitrise niveau;

    private LocalDate dateAcquisition;

    private String commentaire;

    @PrePersist
    public void prePersist() {
        if (dateAcquisition == null) {
            dateAcquisition = LocalDate.now();
        }
    }
}
