package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.WorkflowAction;

import java.time.Instant;

/**
 * Piste d'audit des transitions du workflow d'un besoin (création,
 * approbations, refus, annulation). Écriture seule côté serveur, lecture
 * réservée à l'administrateur.
 */
@Entity
@Table(name = "besoin_approval_history",
       indexes = @Index(name = "idx_history_besoin", columnList = "besoin_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BesoinApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "besoin_id", nullable = false)
    @JsonProperty("besoinId")
    private Long besoinId;

    @Column(nullable = false, length = 150)
    @JsonProperty("actorUsername")
    private String actorUsername;

    @Column(nullable = false, length = 30)
    @JsonProperty("actorRole")
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @JsonProperty("action")
    private WorkflowAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_step", length = 20)
    @JsonProperty("fromStep")
    private ApprovalStep fromStep;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_step", length = 20)
    @JsonProperty("toStep")
    private ApprovalStep toStep;

    @Column(columnDefinition = "TEXT")
    @JsonProperty("reason")
    private String reason;

    @Column(nullable = false, updatable = false)
    @JsonProperty("createdAt")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
