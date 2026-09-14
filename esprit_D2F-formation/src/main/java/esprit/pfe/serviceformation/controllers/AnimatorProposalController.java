package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.animator.AnimatorProposalResponse;
import esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse;
import esprit.pfe.serviceformation.dto.animator.ManagerProposalRequest;
import esprit.pfe.serviceformation.dto.animator.ProposalResponseRequest;
import esprit.pfe.serviceformation.dto.animator.SelfProposalRequest;
import esprit.pfe.serviceformation.services.animator.AnimatorProposalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Workflow propositions et affectations d'animateurs.
 *
 * <p>Règle finale : une auto-proposition ne crée jamais automatiquement une
 * affectation — validation CUP / CHEF_DEPARTEMENT / ADMIN obligatoire.</p>
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Animator Proposals", description = "Workflow propositions d'animation des formations")
public class AnimatorProposalController {

    private final AnimatorProposalService animatorProposalService;

    // ── Propositions ─────────────────────────────────────────────────────

    @Operation(summary = "Proposer un animateur (CUP / ADMIN / CHEF_DEPARTEMENT)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_MANAGER)
    @PostMapping("/formations/{formationId}/animator-proposals")
    public ResponseEntity<AnimatorProposalResponse> createManagerProposal(
            @PathVariable Long formationId,
            @Valid @RequestBody ManagerProposalRequest request) {
        AnimatorProposalResponse created = animatorProposalService.createManagerProposal(formationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Se proposer comme animateur (ENSEIGNANT / ANIMATEUR)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_SELF)
    @PostMapping("/formations/{formationId}/self-animator-proposals")
    public ResponseEntity<AnimatorProposalResponse> createSelfProposal(
            @PathVariable Long formationId,
            @Valid @RequestBody SelfProposalRequest request) {
        AnimatorProposalResponse created = animatorProposalService.createSelfProposal(formationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Lister les propositions d'une formation")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_READ)
    @GetMapping("/formations/{formationId}/animator-proposals")
    public ResponseEntity<List<AnimatorProposalResponse>> listFormationProposals(
            @PathVariable Long formationId) {
        return ResponseEntity.ok(animatorProposalService.listFormationProposals(formationId));
    }

    @Operation(summary = "Mes propositions (auto-propositions et propositions reçues)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_RESPOND)
    @GetMapping("/animator-proposals/mine")
    public ResponseEntity<List<AnimatorProposalResponse>> listMyProposals() {
        return ResponseEntity.ok(animatorProposalService.listMyProposals());
    }

    @Operation(summary = "Propositions en attente de validation (responsables)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE)
    @GetMapping("/animator-proposals/pending")
    public ResponseEntity<List<AnimatorProposalResponse>> listPendingProposals() {
        return ResponseEntity.ok(animatorProposalService.listPendingProposals());
    }

    // ── Réponses de la personne proposée ────────────────────────────────

    @Operation(summary = "Accepter une proposition reçue")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_RESPOND)
    @PutMapping("/animator-proposals/{proposalId}/accept")
    public ResponseEntity<AnimatorProposalResponse> acceptProposal(
            @PathVariable Long proposalId,
            @RequestBody(required = false) ProposalResponseRequest request) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(animatorProposalService.acceptProposal(proposalId, comment));
    }

    @Operation(summary = "Refuser une proposition reçue")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_RESPOND)
    @PutMapping("/animator-proposals/{proposalId}/reject")
    public ResponseEntity<AnimatorProposalResponse> rejectProposal(
            @PathVariable Long proposalId,
            @RequestBody(required = false) ProposalResponseRequest request) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(animatorProposalService.rejectProposal(proposalId, comment));
    }

    @Operation(summary = "Retirer son auto-proposition")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_RESPOND)
    @PutMapping("/animator-proposals/{proposalId}/withdraw")
    public ResponseEntity<AnimatorProposalResponse> withdrawProposal(
            @PathVariable Long proposalId) {
        return ResponseEntity.ok(animatorProposalService.withdrawProposal(proposalId));
    }

    // ── Validation responsable ──────────────────────────────────────────

    @Operation(summary = "Valider une proposition (CUP / CHEF_DEPARTEMENT / ADMIN)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE)
    @PutMapping("/animator-proposals/{proposalId}/approve")
    public ResponseEntity<AnimatorProposalResponse> approveProposal(
            @PathVariable Long proposalId) {
        return ResponseEntity.ok(animatorProposalService.approveProposal(proposalId));
    }

    @Operation(summary = "Refuser une proposition (responsable)")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE)
    @PutMapping("/animator-proposals/{proposalId}/manager-reject")
    public ResponseEntity<AnimatorProposalResponse> managerRejectProposal(
            @PathVariable Long proposalId,
            @RequestBody(required = false) ProposalResponseRequest request) {
        String reason = request != null ? request.getComment() : null;
        return ResponseEntity.ok(animatorProposalService.managerRejectProposal(proposalId, reason));
    }

    // ── Affectations définitives ────────────────────────────────────────

    @Operation(summary = "Créer l'affectation définitive depuis une proposition approuvée")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_ASSIGNMENT_MANAGE)
    @PostMapping("/formations/{formationId}/animators/{proposalId}/assign")
    public ResponseEntity<FormationAnimatorResponse> assignAnimator(
            @PathVariable Long formationId,
            @PathVariable Long proposalId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(animatorProposalService.assignAnimator(formationId, proposalId));
    }

    @Operation(summary = "Affectations d'animateurs d'une formation")
    @PreAuthorize(AuthorizationMatrix.ANIMATOR_PROPOSAL_READ)
    @GetMapping("/formations/{formationId}/animators")
    public ResponseEntity<List<FormationAnimatorResponse>> listFormationAnimators(
            @PathVariable Long formationId) {
        return ResponseEntity.ok(animatorProposalService.listFormationAnimators(formationId));
    }
}
