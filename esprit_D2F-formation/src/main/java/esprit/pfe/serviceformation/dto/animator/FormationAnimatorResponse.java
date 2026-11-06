package esprit.pfe.serviceformation.dto.animator;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.AssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Vue d'une affectation définitive d'animateur.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormationAnimatorResponse {

    private Long id;
    private Long formationId;
    private String formationTitre;
    private String teacherId;
    private String teacherNom;
    private String teacherPrenom;
    private String teacherEmail;
    private String animateurId;
    private String animateurNom;
    private AnimatorRole role;
    private String assignedBy;
    private LocalDateTime assignedAt;
    private AssignmentStatus status;
    private Long proposalId;
}
