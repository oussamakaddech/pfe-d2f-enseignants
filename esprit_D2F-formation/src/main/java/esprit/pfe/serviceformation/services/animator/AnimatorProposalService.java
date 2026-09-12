package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.dto.animator.AnimatorProposalResponse;
import esprit.pfe.serviceformation.dto.animator.ManagerProposalRequest;
import esprit.pfe.serviceformation.dto.animator.SelfProposalRequest;
import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.AssignmentStatus;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationAnimator;
import esprit.pfe.serviceformation.entities.FormationAnimatorProposal;
import esprit.pfe.serviceformation.entities.ProposalStatus;
import esprit.pfe.serviceformation.entities.ProposalType;
import esprit.pfe.serviceformation.entities.ProposerType;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.exception.ProposalConflictException;
import esprit.pfe.serviceformation.exception.ProposalIncompatibilityException;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.messaging.AnimatorProposalEvent;
import esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher;
import esprit.pfe.serviceformation.messaging.FormationAnimatorEvent;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorProposalRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.services.CurrentUser;
import esprit.pfe.serviceformation.services.animator.AnimatorScopeService.ResolvedAnimatorScope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Workflow complet des propositions d'animation.
 *
 * <p>Règle finale : une auto-proposition ne crée JAMAIS automatiquement une
 * affectation — un responsable (CUP, CHEF_DEPARTEMENT, ADMIN) doit valider
 * avant création de {@link FormationAnimator} et envoi des invitations.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnimatorProposalService {

    /** Statuts non terminaux : une proposition identique ne peut pas coexister. */
    private static final List<ProposalStatus> ACTIVE_STATUSES = List.of(
            ProposalStatus.PROPOSED, ProposalStatus.PENDING_VALIDATION, ProposalStatus.ACCEPTED_BY_TRAINER);

    /** Statuts permettant une réponse de la personne proposée. */
    private static final List<ProposalStatus> RESPONDABLE_STATUSES = List.of(
            ProposalStatus.PROPOSED, ProposalStatus.PENDING_VALIDATION);

    /** Maximum d'animateurs simultanés par formation (CO_TRAINER + FACILITATOR). */
    private static final int MAX_ANIMATORS_PER_FORMATION = 5;

    private final FormationAnimatorProposalRepository proposalRepository;
    private final FormationAnimatorRepository animatorRepository;
    private final FormationRepository formationRepository;
    private final EnseignantRepository enseignantRepository;
    private final AnimateurExterneRepository animateurExterneRepository;
    private final SeanceFormationRepository seanceRepository;
    private final AnimatorScopeService scopeService;
    private final AnimatorProposalEventPublisher eventPublisher;
    private final AnimatorCalendarService calendarService;

    // ══════════════════════════════════════════════════════════════════
    // 1. Proposition par un responsable (CUP / ADMIN)
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AnimatorProposalResponse createManagerProposal(Long formationId, ManagerProposalRequest request) {
        ResolvedAnimatorScope scope = requireManagerScope();
        Formation formation = scopeService.requireFormation(formationId);

        ensureCanManageFormation(formation, scope);
        ensureFormationAcceptsProposals(formation);
        requireNotAlreadyLeadTrainer(formationId, request.getRole());
        ensureAnimatorSlotsAvailable(formationId);

        Enseignant proposer = requireEnseignant(request.getProposerId());
        scopeService.ensureProposerInScope(proposer, scope);

        ensureNoDuplicate(formationId, proposer.getId(), request.getRole());

        FormationAnimatorProposal proposal = FormationAnimatorProposal.builder()
                .formationId(formationId)
                .proposerId(proposer.getId())
                .proposerType(request.getProposerType())
                .proposalType(ProposalType.MANAGER_PROPOSAL)
                .role(request.getRole())
                .status(ProposalStatus.PROPOSED)
                .motivation(request.getMotivation())
                .proposedBy(scope.user().username())
                .proposedAt(LocalDateTime.now(ZoneId.systemDefault()))
                .build();
        proposal = proposalRepository.save(proposal);

        eventPublisher.publishProposalCreated(toEvent(proposal, formation, scope.user()));
        log.info("Proposition manager {} créée sur formation {} par {} pour {}",
                proposal.getId(), formationId, scope.user().username(), proposer.getId());
        return toResponse(proposal, formation, scope.user());
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. Auto-proposition (ENSEIGNANT / ANIMATEUR)
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AnimatorProposalResponse createSelfProposal(Long formationId, SelfProposalRequest request) {
        ResolvedAnimatorScope scope = requireSelfScope();
        Formation formation = scopeService.requireFormation(formationId);

        ensureCanSelfPropose(formation);
        requireNotAlreadyLeadTrainer(formationId, request.getRole());
        ensureAnimatorSlotsAvailable(formationId);

        Enseignant self = requireOwnEnseignant(scope.user());
        ensureNoDuplicate(formationId, self.getId(), request.getRole());
        ensureCompetenciesCompatible(formation, self);
        ensureNoScheduleConflict(formation, self);

        FormationAnimatorProposal proposal = FormationAnimatorProposal.builder()
                .formationId(formationId)
                .proposerId(self.getId())
                .proposerType(resolveSelfProposerType(scope.user()))
                .proposalType(ProposalType.SELF_PROPOSAL)
                .role(request.getRole())
                .status(ProposalStatus.PENDING_VALIDATION)
                .motivation(request.getMotivation())
                .proposedBy(scope.user().username())
                .proposedAt(LocalDateTime.now(ZoneId.systemDefault()))
                .build();
        proposal = proposalRepository.save(proposal);

        eventPublisher.publishProposalCreated(toEvent(proposal, formation, scope.user()));
        log.info("Auto-proposition {} créée sur formation {} par {}",
                proposal.getId(), formationId, scope.user().username());
        return toResponse(proposal, formation, scope.user());
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. Réponse de la personne proposée (accept / reject)
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AnimatorProposalResponse acceptProposal(Long proposalId, String comment) {
        FormationAnimatorProposal proposal = requireProposal(proposalId);
        CurrentUser user = scopeService.currentUser();
        requireIsTarget(proposal, user);

        if (!RESPONDABLE_STATUSES.contains(proposal.getStatus())) {
            throw new ProposalConflictException(
                    "Transition invalide : la proposition " + proposalId + " (statut "
                            + proposal.getStatus() + ") ne peut plus être acceptée.");
        }
        // Une auto-proposition n'est jamais confirmée par son créateur :
        // l'acceptation n'ouvre que le chemin de validation responsable.
        proposal.setStatus(ProposalStatus.ACCEPTED_BY_TRAINER);
        proposal.setRespondedAt(LocalDateTime.now(ZoneId.systemDefault()));
        proposal.setResponseComment(comment);
        proposal = proposalRepository.save(proposal);

        Formation formation = scopeService.requireFormation(proposal.getFormationId());
        eventPublisher.publishProposalAccepted(toEvent(proposal, formation, user));
        return toResponse(proposal, formation, user);
    }

    @Transactional
    public AnimatorProposalResponse rejectProposal(Long proposalId, String comment) {
        FormationAnimatorProposal proposal = requireProposal(proposalId);
        CurrentUser user = scopeService.currentUser();
        requireIsTarget(proposal, user);

        if (!RESPONDABLE_STATUSES.contains(proposal.getStatus())) {
            throw new ProposalConflictException(
                    "Transition invalide : la proposition " + proposalId + " (statut "
                            + proposal.getStatus() + ") ne peut plus être refusée.");
        }
        proposal.setStatus(ProposalStatus.REJECTED_BY_TRAINER);
        proposal.setRespondedAt(LocalDateTime.now(ZoneId.systemDefault()));
        proposal.setResponseComment(comment);
        proposal = proposalRepository.save(proposal);

        Formation formation = scopeService.requireFormation(proposal.getFormationId());
        return toResponse(proposal, formation, user);
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. Validation par un responsable (approve / manager-reject)
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AnimatorProposalResponse approveProposal(Long proposalId) {
        FormationAnimatorProposal proposal = requireProposal(proposalId);
        ResolvedAnimatorScope scope = requireManagerScope();
        Formation formation = scopeService.requireFormation(proposal.getFormationId());

        ensureCanManageFormation(formation, scope);
        requireNotSelfValidation(proposal, scope.user());
        requireApprovableStatus(proposal);
        requireNotAlreadyLeadTrainer(proposal.getFormationId(), proposal.getRole());
        ensureAnimatorSlotsAvailable(proposal.getFormationId());
        ensureNoExistingAssignment(proposal);

        proposal.setStatus(ProposalStatus.APPROVED);
        proposal.setValidatedBy(scope.user().username());
        proposal.setValidatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        proposal = proposalRepository.save(proposal);

        // Création de l'affectation définitive — uniquement après validation.
        FormationAnimator assignment = createAssignment(proposal, scope.user());
        eventPublisher.publishProposalApproved(toEvent(proposal, formation, scope.user()));
        eventPublisher.publishAnimatorAssigned(toAnimatorEvent(assignment, formation, scope.user()));

        // Confirmation + invitations calendrier idempotentes.
        calendarService.onAnimatorConfirmed(formation, assignment, proposal);
        return toResponse(proposal, formation, scope.user());
    }

    @Transactional
    public AnimatorProposalResponse managerRejectProposal(Long proposalId, String reason) {
        FormationAnimatorProposal proposal = requireProposal(proposalId);
        ResolvedAnimatorScope scope = requireManagerScope();
        Formation formation = scopeService.requireFormation(proposal.getFormationId());

        ensureCanManageFormation(formation, scope);
        requireNotSelfValidation(proposal, scope.user());
        if (!ACTIVE_STATUSES.contains(proposal.getStatus())
                && proposal.getStatus() != ProposalStatus.ACCEPTED_BY_TRAINER) {
            throw new ProposalConflictException(
                    "Transition invalide : la proposition " + proposalId + " (statut "
                            + proposal.getStatus() + ") ne peut plus être refusée par un responsable.");
        }

        proposal.setStatus(ProposalStatus.REJECTED);
        proposal.setValidatedBy(scope.user().username());
        proposal.setValidatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        proposal.setRejectionReason(reason);
        proposal = proposalRepository.save(proposal);
        return toResponse(proposal, formation, scope.user());
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. Retrait d'une auto-proposition
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AnimatorProposalResponse withdrawProposal(Long proposalId) {
        FormationAnimatorProposal proposal = requireProposal(proposalId);
        CurrentUser user = scopeService.currentUser();
        requireIsCreator(proposal, user);

        if (!ACTIVE_STATUSES.contains(proposal.getStatus())) {
            throw new ProposalConflictException(
                    "Transition invalide : la proposition " + proposalId + " (statut "
                            + proposal.getStatus() + ") ne peut plus être retirée.");
        }
        proposal.setStatus(ProposalStatus.CANCELLED);
        proposal = proposalRepository.save(proposal);
        Formation formation = scopeService.requireFormation(proposal.getFormationId());
        return toResponse(proposal, formation, user);
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. Affectation définitive (post-validation)
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse assignAnimator(
            Long formationId, Long proposalId) {
        ResolvedAnimatorScope scope = requireManagerScope();
        Formation formation = scopeService.requireFormation(formationId);
        FormationAnimatorProposal proposal = requireProposal(proposalId);

        ensureCanManageFormation(formation, scope);
        if (!proposal.getFormationId().equals(formationId)) {
            throw new ProposalConflictException(
                    "La proposition " + proposalId + " n'appartient pas à la formation " + formationId + ".");
        }
        if (proposal.getStatus() != ProposalStatus.APPROVED) {
            throw new ProposalConflictException(
                    "Affectation impossible : la proposition " + proposalId
                            + " doit être APPROVED avant affectation (statut actuel : "
                            + proposal.getStatus() + ").");
        }
        ensureNoExistingAssignment(proposal);
        FormationAnimator assignment = createAssignment(proposal, scope.user());

        eventPublisher.publishAnimatorAssigned(toAnimatorEvent(assignment, formation, scope.user()));
        calendarService.onAnimatorConfirmed(formation, assignment, proposal);
        return toAnimatorResponse(assignment, formation);
    }

    // ══════════════════════════════════════════════════════════════════
    // 7. Consultation
    // ══════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<AnimatorProposalResponse> listFormationProposals(Long formationId) {
        Formation formation = scopeService.requireFormation(formationId);
        CurrentUser user = scopeService.currentUser();
        return proposalRepository.findByFormationIdOrderByProposedAtDesc(formationId).stream()
                .map(p -> toResponse(p, formation, user))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnimatorProposalResponse> listMyProposals() {
        CurrentUser user = scopeService.currentUser();
        Optional<Enseignant> self = findOwnFiche(user);
        String proposerId = self.map(Enseignant::getId).orElse(user.username());
        List<AnimatorProposalResponse> result = new java.util.ArrayList<>();
        for (FormationAnimatorProposal p : proposalRepository.findByProposerIdAndStatusIn(
                proposerId, List.of(ProposalStatus.values()))) {
            Formation formation = formationRepository.findById(p.getFormationId()).orElse(null);
            result.add(toResponse(p, formation, user));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<AnimatorProposalResponse> listPendingProposals() {
        ResolvedAnimatorScope scope = requireManagerScope();
        List<FormationAnimatorProposal> pending = proposalRepository.findByStatusIn(
                List.of(ProposalStatus.PENDING_VALIDATION, ProposalStatus.ACCEPTED_BY_TRAINER, ProposalStatus.PROPOSED));
        return pending.stream()
                .filter(p -> isVisibleInScope(p, scope))
                .map(p -> toResponse(p, formationRepository.findById(p.getFormationId()).orElse(null), scope.user()))
                .toList();
    }

    // ══════════════════════════════════════════════════════════════════
    // 8. Affectations d'une formation
    // ══════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse> listFormationAnimators(
            Long formationId) {
        Formation formation = scopeService.requireFormation(formationId);
        return animatorRepository.findByFormationId(formationId).stream()
                .map(a -> toAnimatorResponse(a, formation))
                .toList();
    }

    // ══════════════════════════════════════════════════════════════════
    // Garde-fous métier
    // ══════════════════════════════════════════════════════════════════

    private ResolvedAnimatorScope requireManagerScope() {
        ResolvedAnimatorScope scope = scopeService.resolveScope();
        if (!scope.global() && !scope.user().hasRole("CUP") && !scope.user().hasRole("CHEF_DEPARTEMENT")) {
            throw new AccessDeniedException(
                    "Rôle insuffisant : seuls CUP, CHEF_DEPARTEMENT et ADMIN gèrent les propositions.");
        }
        return scope;
    }

    private ResolvedAnimatorScope requireSelfScope() {
        ResolvedAnimatorScope scope = scopeService.resolveScope();
        if (!scope.user().hasRole("ENSEIGNANT") && !scope.user().hasRole("ANIMATEUR") && !scope.global()) {
            throw new AccessDeniedException(
                    "Rôle insuffisant : seuls ENSEIGNANT et ANIMATEUR peuvent se proposer.");
        }
        return scope;
    }

    private void ensureCanManageFormation(Formation formation, ResolvedAnimatorScope scope) {
        scopeService.ensureCanManageFormation(formation, scope);
    }

    /** La formation doit être dans un état compatible avec les propositions. */
    private void ensureCanSelfPropose(Formation formation) {
        ensureFormationAcceptsProposals(formation);
    }

    private void ensureFormationAcceptsProposals(Formation formation) {
        EtatFormation etat = formation.getEtatFormation();
        if (etat == EtatFormation.ANNULE || etat == EtatFormation.ACHEVE) {
            throw new ProposalConflictException(
                    "La formation " + formation.getIdFormation()
                            + " (état " + etat + ") n'accepte plus de propositions d'animation.");
        }
        if (formation.getDateFin() != null
                && formation.getDateFin().isBefore(LocalDate.now(ZoneId.systemDefault()))) {
            throw new ProposalConflictException(
                    "La formation " + formation.getIdFormation() + " est terminée (date de fin passée).");
        }
    }

    /** Un seul LEAD_TRAINER actif par formation. */
    private void requireNotAlreadyLeadTrainer(Long formationId, AnimatorRole role) {
        if (role != AnimatorRole.LEAD_TRAINER) {
            return;
        }
        boolean leadAssigned = animatorRepository
                .findFirstByFormationIdAndRoleAndStatus(formationId, AnimatorRole.LEAD_TRAINER, AssignmentStatus.ACTIVE)
                .isPresent();
        if (leadAssigned) {
            throw new ProposalConflictException(
                    "Un LEAD_TRAINER est déjà affecté à la formation " + formationId
                            + " : une seule proposition lead est autorisée.");
        }
        boolean leadProposed = !proposalRepository
                .findByFormationIdAndRoleAndStatusIn(formationId, AnimatorRole.LEAD_TRAINER, ACTIVE_STATUSES)
                .isEmpty();
        if (leadProposed) {
            throw new ProposalConflictException(
                    "Une proposition LEAD_TRAINER est déjà en cours pour la formation " + formationId + ".");
        }
    }

    /** Nombre maximal d'animateurs non dépassé. */
    private void ensureAnimatorSlotsAvailable(Long formationId) {
        long active = animatorRepository.findByFormationIdAndStatus(formationId, AssignmentStatus.ACTIVE).size();
        if (active >= MAX_ANIMATORS_PER_FORMATION) {
            throw new ProposalConflictException(
                    "Nombre maximal d'animateurs atteint pour la formation " + formationId
                            + " (" + MAX_ANIMATORS_PER_FORMATION + ").");
        }
    }

    /** Aucune proposition identique en cours (même formation + personne + rôle). */
    private void ensureNoDuplicate(Long formationId, String proposerId, AnimatorRole role) {
        Optional<FormationAnimatorProposal> duplicate = proposalRepository
                .findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                        formationId, proposerId, role, ACTIVE_STATUSES);
        if (duplicate.isPresent()) {
            throw new ProposalConflictException(
                    "Doublon : une proposition active existe déjà pour " + proposerId
                            + " en tant que " + role + " sur la formation " + formationId + ".");
        }
    }

    /**
     * Compétences compatibles : la spécialité de l'enseignant doit recouper
     * une compétence visée par la formation (via libellés dénormalisés).
     * Un ADMIN n'est pas bloqué (peut proposer hors spécialité).
     */
    private void ensureCompetenciesCompatible(Formation formation, Enseignant enseignant) {
        if (formation.getFormationCompetences() == null || formation.getFormationCompetences().isEmpty()) {
            return; // formation sans compétences ciblées : pas de contrôle bloquant
        }
        String specialite = enseignant.getSpecialite();
        if (specialite == null || specialite.isBlank()) {
            throw new ProposalIncompatibilityException(
                    "Compétences incompatibles : aucune spécialité déclarée pour " + enseignant.getId()
                            + " alors que la formation cible des compétences précises.");
        }
        boolean match = formation.getFormationCompetences().stream()
                .map(fc -> fc.getCompetenceNom() != null ? fc.getCompetenceNom().toLowerCase() : "")
                .anyMatch(nom -> !nom.isBlank()
                        && specialite.toLowerCase().contains(nom)
                        || nom.contains(specialite.toLowerCase()));
        if (!match) {
            throw new ProposalIncompatibilityException(
                    "Compétences incompatibles : la spécialité '" + specialite
                            + "' ne recoupe aucune compétence visée par la formation "
                            + formation.getIdFormation() + ".");
        }
    }

    /** Conflit horaire : l'animateur ne doit pas animer deux formations aux mêmes dates. */
    private void ensureNoScheduleConflict(Formation formation, Enseignant enseignant) {
        List<Formation> conflicts = seanceRepository.findFormationsByAnimateurAndPeriod(
                enseignant.getId(), formation.getDateDebut(), formation.getDateFin());
        if (!conflicts.isEmpty()) {
            throw new ProposalIncompatibilityException(
                    "Conflit horaire : " + enseignant.getId() + " anime déjà "
                            + conflicts.size() + " formation(s) sur la période du "
                            + formation.getDateDebut() + " au " + formation.getDateFin() + ".");
        }
    }

    private Enseignant requireEnseignant(String enseignantId) {
        return enseignantRepository.findById(enseignantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Enseignant introuvable : " + enseignantId));
    }

    /** Fiche de l'utilisateur connecté — obligatoire pour une auto-proposition. */
    private Enseignant requireOwnEnseignant(CurrentUser user) {
        return findOwnFiche(user)
                .orElseThrow(() -> new ProposalIncompatibilityException(
                        "Aucune fiche enseignant liée à votre compte : impossible de se proposer."));
    }

    private Optional<Enseignant> findOwnFiche(CurrentUser user) {
        Optional<Enseignant> fiche = Optional.empty();
        if (user.userId() != null && !user.userId().isBlank()) {
            fiche = enseignantRepository.findByUserId(user.userId());
        }
        if (fiche.isEmpty() && user.email() != null && !user.email().isBlank()) {
            fiche = enseignantRepository.findByMailIgnoreCase(user.email());
        }
        return fiche;
    }

    private ProposerType resolveSelfProposerType(CurrentUser user) {
        return user.hasRole("ANIMATEUR") ? ProposerType.ANIMATEUR : ProposerType.TEACHER;
    }

    private FormationAnimatorProposal requireProposal(Long proposalId) {
        return proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Proposition introuvable : " + proposalId));
    }

    /** Seule la personne proposée peut répondre à la proposition. */
    private void requireIsTarget(FormationAnimatorProposal proposal, CurrentUser user) {
        Enseignant target = requireEnseignant(proposal.getProposerId());
        boolean isTarget = Objects.equals(target.getUserId(), user.userId())
                || (target.getMail() != null && target.getMail().equalsIgnoreCase(user.email()))
                || Objects.equals(target.getId(), user.username());
        if (!isTarget && !Objects.equals(proposal.getProposedBy(), user.username())) {
            throw new AccessDeniedException(
                    "Seule la personne proposée peut répondre à cette proposition.");
        }
    }

    /** Le créateur d'une proposition ne peut jamais la valider lui-même. */
    private void requireNotSelfValidation(FormationAnimatorProposal proposal, CurrentUser user) {
        if (Objects.equals(proposal.getProposedBy(), user.username())) {
            throw new AccessDeniedException(
                    "Le créateur d'une proposition ne peut pas la valider lui-même (séparation de pouvoirs).");
        }
        // Auto-proposition : la cible == le créateur → jamais auto-validation.
        if (proposal.getProposalType() == ProposalType.SELF_PROPOSAL) {
            Enseignant target = requireEnseignant(proposal.getProposerId());
            boolean isTarget = Objects.equals(target.getUserId(), user.userId())
                    || (target.getMail() != null && target.getMail().equalsIgnoreCase(user.email()));
            if (isTarget) {
                throw new AccessDeniedException(
                        "Vous ne pouvez pas valider votre propre auto-proposition.");
            }
        }
    }

    private void requireIsCreator(FormationAnimatorProposal proposal, CurrentUser user) {
        if (!Objects.equals(proposal.getProposedBy(), user.username())) {
            throw new AccessDeniedException(
                    "Seul le créateur d'une proposition peut la retirer.");
        }
    }

    private void requireApprovableStatus(FormationAnimatorProposal proposal) {
        List<ProposalStatus> approvable = List.of(
                ProposalStatus.PENDING_VALIDATION, ProposalStatus.ACCEPTED_BY_TRAINER, ProposalStatus.PROPOSED);
        if (!approvable.contains(proposal.getStatus())) {
            throw new ProposalConflictException(
                    "Transition invalide : la proposition " + proposal.getId() + " (statut "
                            + proposal.getStatus() + ") ne peut pas être validée.");
        }
    }

    private void ensureNoExistingAssignment(FormationAnimatorProposal proposal) {
        if (proposal.getProposerType() == ProposerType.EXTERNAL_TRAINER) {
            Optional<FormationAnimator> existing = animatorRepository
                    .findFirstByFormationIdAndAnimateurIdAndStatus(
                            proposal.getFormationId(), proposal.getProposerId(), AssignmentStatus.ACTIVE);
            if (existing.isPresent()) {
                throw new ProposalConflictException(
                        "Affectation déjà existante pour " + proposal.getProposerId()
                                + " sur la formation " + proposal.getFormationId() + ".");
            }
            return;
        }
        Optional<FormationAnimator> existing = animatorRepository
                .findFirstByFormationIdAndTeacherIdAndStatus(
                        proposal.getFormationId(), proposal.getProposerId(), AssignmentStatus.ACTIVE);
        if (existing.isPresent()) {
            throw new ProposalConflictException(
                    "Affectation déjà existante pour " + proposal.getProposerId()
                            + " sur la formation " + proposal.getFormationId() + ".");
        }
    }

    private FormationAnimator createAssignment(FormationAnimatorProposal proposal, CurrentUser user) {
        FormationAnimator.FormationAnimatorBuilder builder = FormationAnimator.builder()
                .formationId(proposal.getFormationId())
                .role(proposal.getRole())
                .assignedBy(user.username())
                .assignedAt(LocalDateTime.now(ZoneId.systemDefault()))
                .status(AssignmentStatus.ACTIVE)
                .proposalId(proposal.getId());
        if (proposal.getProposerType() == ProposerType.EXTERNAL_TRAINER) {
            builder.animateurId(proposal.getProposerId());
        } else {
            builder.teacherId(proposal.getProposerId());
        }
        return animatorRepository.save(builder.build());
    }

    private boolean isVisibleInScope(FormationAnimatorProposal proposal, ResolvedAnimatorScope scope) {
        if (scope.global()) {
            return true;
        }
        Formation formation = formationRepository.findById(proposal.getFormationId()).orElse(null);
        if (formation == null) {
            return false;
        }
        try {
            scopeService.ensureCanManageFormation(formation, scope);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // Mapping événements / DTO
    // ══════════════════════════════════════════════════════════════════

    private AnimatorProposalEvent toEvent(
            FormationAnimatorProposal p, Formation f, CurrentUser actor) {
        String proposerEmail = resolveProposerEmail(p);
        return AnimatorProposalEvent.builder()
                .eventId(AnimatorProposalEventPublisher.newEventId())
                .eventType(p.getStatus().name())
                .proposalId(p.getId())
                .formationId(p.getFormationId())
                .formationTitre(f != null ? f.getTitreFormation() : null)
                .proposerId(p.getProposerId())
                .proposerEmail(proposerEmail)
                .proposerType(p.getProposerType())
                .proposalType(p.getProposalType())
                .role(p.getRole())
                .status(p.getStatus())
                .actorUsername(actor.username())
                .occurredAt(java.time.Instant.now())
                .build();
    }

    private FormationAnimatorEvent toAnimatorEvent(
            FormationAnimator a, Formation f, CurrentUser user) {
        String email = a.getTeacherId() != null
                ? enseignantRepository.findById(a.getTeacherId()).map(Enseignant::getMail).orElse(null)
                : null;
        return FormationAnimatorEvent.builder()
                .eventId(AnimatorProposalEventPublisher.newEventId())
                .eventType("ANIMATOR_ASSIGNED")
                .assignmentId(a.getId())
                .formationId(a.getFormationId())
                .formationTitre(f != null ? f.getTitreFormation() : null)
                .proposalId(a.getProposalId())
                .animatorId(a.getTeacherId() != null ? a.getTeacherId() : a.getAnimateurId())
                .animatorEmail(email)
                .role(a.getRole().name())
                .assignedBy(user.username())
                .occurredAt(java.time.Instant.now())
                .build();
    }

    private String resolveProposerEmail(FormationAnimatorProposal p) {
        if (p.getProposerType() == ProposerType.EXTERNAL_TRAINER) {
            return animateurExterneRepository.findById(Long.valueOf(p.getProposerId()))
                    .map(a -> a.getEmail())
                    .orElse(null);
        }
        return enseignantRepository.findById(p.getProposerId())
                .map(Enseignant::getMail)
                .orElse(null);
    }

    private AnimatorProposalResponse toResponse(
            FormationAnimatorProposal p, Formation f, CurrentUser user) {
        String nom = null;
        String prenom = null;
        String email = null;
        if (p.getProposerType() != ProposerType.EXTERNAL_TRAINER) {
            Optional<Enseignant> ens = enseignantRepository.findById(p.getProposerId());
            if (ens.isPresent()) {
                nom = ens.get().getNom();
                prenom = ens.get().getPrenom();
                email = ens.get().getMail();
            }
        }
        boolean isManager = user.isAdmin() || user.hasRole("CUP") || user.hasRole("CHEF_DEPARTEMENT");
        boolean isTargetOrCreator = Objects.equals(p.getProposedBy(), user.username())
                || (email != null && email.equalsIgnoreCase(user.email()));
        return AnimatorProposalResponse.builder()
                .id(p.getId())
                .formationId(p.getFormationId())
                .formationTitre(f != null ? f.getTitreFormation() : null)
                .proposerId(p.getProposerId())
                .proposerNom(nom)
                .proposerPrenom(prenom)
                .proposerEmail(email)
                .proposerType(p.getProposerType())
                .proposalType(p.getProposalType())
                .role(p.getRole())
                .status(p.getStatus())
                .motivation(p.getMotivation())
                .proposedBy(p.getProposedBy())
                .proposedAt(p.getProposedAt())
                .respondedAt(p.getRespondedAt())
                .validatedBy(p.getValidatedBy())
                .validatedAt(p.getValidatedAt())
                .rejectionReason(p.getRejectionReason())
                .responseComment(p.getResponseComment())
                .canRespond(isTargetOrCreator && RESPONDABLE_STATUSES.contains(p.getStatus()))
                .canValidate(isManager
                        && !Objects.equals(p.getProposedBy(), user.username())
                        && ACTIVE_STATUSES.contains(p.getStatus()))
                .canWithdraw(Objects.equals(p.getProposedBy(), user.username())
                        && ACTIVE_STATUSES.contains(p.getStatus()))
                .build();
    }

    private esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse toAnimatorResponse(
            FormationAnimator a, Formation f) {
        String nom = null;
        String prenom = null;
        String email = null;
        if (a.getTeacherId() != null) {
            Optional<Enseignant> ens = enseignantRepository.findById(a.getTeacherId());
            if (ens.isPresent()) {
                nom = ens.get().getNom();
                prenom = ens.get().getPrenom();
                email = ens.get().getMail();
            }
        }
        return esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse.builder()
                .id(a.getId())
                .formationId(a.getFormationId())
                .formationTitre(f != null ? f.getTitreFormation() : null)
                .teacherId(a.getTeacherId())
                .teacherNom(nom)
                .teacherPrenom(prenom)
                .teacherEmail(email)
                .animateurId(a.getAnimateurId())
                .role(a.getRole())
                .assignedBy(a.getAssignedBy())
                .assignedAt(a.getAssignedAt())
                .status(a.getStatus())
                .proposalId(a.getProposalId())
                .build();
    }

    /** Séances d'une formation (exposé pour le service calendrier). */
    @Transactional(readOnly = true)
    public List<SeanceFormation> formationSeances(Long formationId) {
        return seanceRepository.findByFormation_IdFormation(formationId);
    }
}
