package tn.esprit.d2f.competence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDateTime;

@Entity
@Table(name = "competence_prerequisite",
       uniqueConstraints = @UniqueConstraint(columnNames = {"competence_id", "prerequisite_id"}),
       indexes = {
           @Index(name = "idx_prereq_competence", columnList = "competence_id"),
           @Index(name = "idx_prereq_prerequisite", columnList = "prerequisite_id")
       })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
@ToString(exclude = {"competence", "prerequisite"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetencePrerequisite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competence_id", nullable = false)
    private Competence competence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prerequisite_id", nullable = false)
    private Competence prerequisite;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_minimum", nullable = false)
    private NiveauMaitrise niveauMinimum;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
