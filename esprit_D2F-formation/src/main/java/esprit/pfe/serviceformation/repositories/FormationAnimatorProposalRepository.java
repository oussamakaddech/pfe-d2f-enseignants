package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.FormationAnimatorProposal;
import esprit.pfe.serviceformation.entities.ProposalStatus;
import esprit.pfe.serviceformation.entities.ProposalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FormationAnimatorProposalRepository
        extends JpaRepository<FormationAnimatorProposal, Long>, JpaSpecificationExecutor<FormationAnimatorProposal> {

    List<FormationAnimatorProposal> findByFormationIdOrderByProposedAtDesc(Long formationId);

    /** Propositions non terminales d'une personne (doublons, retraits). */
    List<FormationAnimatorProposal> findByProposerIdAndStatusIn(String proposerId, List<ProposalStatus> statuses);

    /** Propositions en attente de validation (file des responsables). */
    List<FormationAnimatorProposal> findByStatusIn(List<ProposalStatus> statuses);

    /** Doublon actif : même formation + personne + rôle, statut non terminal. */
    Optional<FormationAnimatorProposal> findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
            Long formationId, String proposerId, AnimatorRole role, List<ProposalStatus> statuses);

    /** Une seule proposition active pour ce rôle (LEAD_TRAINER notamment). */
    List<FormationAnimatorProposal> findByFormationIdAndRoleAndStatusIn(
            Long formationId, AnimatorRole role, List<ProposalStatus> statuses);

    /** Propositions d'une formation par type. */
    List<FormationAnimatorProposal> findByFormationIdAndProposalType(Long formationId, ProposalType proposalType);

    /** Propositions reçues par une personne (manager proposal à accepter/refuser). */
    List<FormationAnimatorProposal> findByProposerIdAndProposalTypeAndStatusIn(
            String proposerId, ProposalType proposalType, List<ProposalStatus> statuses);

    /** Expiration : propositions PENDING/PROPOSED plus anciennes que la date. */
    List<FormationAnimatorProposal> findByStatusInAndProposedAtBefore(List<ProposalStatus> statuses, LocalDateTime cutoff);

    /** Verrou pessimiste pour éviter les double-validations concurrentes. */
    @Query("SELECT p FROM FormationAnimatorProposal p WHERE p.id = :id")
    @Modifying
    Optional<FormationAnimatorProposal> findByIdForUpdate(@Param("id") Long id);
}
