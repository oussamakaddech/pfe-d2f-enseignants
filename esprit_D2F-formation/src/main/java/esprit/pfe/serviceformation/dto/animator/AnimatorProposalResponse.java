package esprit.pfe.serviceformation.dto.animator;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.ProposalStatus;
import esprit.pfe.serviceformation.entities.ProposalType;
import esprit.pfe.serviceformation.entities.ProposerType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Vue d'une proposition d'animation (contrat API stable).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnimatorProposalResponse {

    private Long id;
    private Long formationId;
    private String formationTitre;
    private String proposerId;
    private String proposerNom;
    private String proposerPrenom;
    private String proposerEmail;
    private ProposerType proposerType;
    private ProposalType proposalType;
    private AnimatorRole role;
    private ProposalStatus status;
    private String motivation;
    private String proposedBy;
    private LocalDateTime proposedAt;
    private LocalDateTime respondedAt;
    private String validatedBy;
    private LocalDateTime validatedAt;
    private String rejectionReason;
    private String responseComment;
    private boolean canRespond;
    private boolean canValidate;
    private boolean canWithdraw;
}
