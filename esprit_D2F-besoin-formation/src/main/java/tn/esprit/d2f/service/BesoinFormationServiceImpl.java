package tn.esprit.d2f.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.dto.BesoinFormationApprovedEvent;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.dto.NotificationEventPublisher;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinApprovalHistory;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.entity.enumerations.WorkflowAction;
import tn.esprit.d2f.exception.InvalidWorkflowTransitionException;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinApprovalHistoryRepository;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.ReviewerScopeService.ResolvedScope;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Supplier;

/**
 * Service métier pour la gestion des besoins de formation — workflow sécurisé.
 *
 * <p>Règles appliquées EXCLUSIVEMENT côté serveur (jamais depuis le frontend) :</p>
 * <ul>
 *   <li>Créateur, rôle, UP et département déduits du JWT + table {@code reviewer_scope}.</li>
 *   <li>INDIVIDUEL (enseignant) : CUP → CHEF_DEPARTEMENT → ADMIN.</li>
 *   <li>COLLECTIF (CUP) : CHEF_DEPARTEMENT → ADMIN (le CUP ne valide jamais son besoin).</li>
 *   <li>COLLECTIF (chef) : ADMIN (le chef ne valide jamais son besoin).</li>
 *   <li>Le créateur ne peut jamais approuver ni refuser son propre besoin.</li>
 *   <li>CUP/chef limités à leur périmètre (UP / département).</li>
 *   <li>Événement RabbitMQ publié UNIQUEMENT après approbation finale ADMIN.</li>
 * </ul>
 */
@Slf4j
@Service
public class BesoinFormationServiceImpl implements IBesoinFormationService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_ENSEIGNANT = "ROLE_ENSEIGNANT";
    private static final String ROLE_ANIMATEUR = "ROLE_ANIMATEUR";
    private static final String NOT_FOUND_SUFFIX = " not found";
    private static final String BESOIN_FORMATION_WITH_ID_PREFIX = "BesoinFormation with id ";

    /**
     * DSI §: statuts « approuvé par le D2F » — le besoin quitte la liste des
     * besoins (ADMIN_APPROVED + FORMATION_CREATED, fallback /approved inclus).
     */
    private static final Collection<BesoinStatus> APPROVED_FINAL_STATUSES =
            List.of(BesoinStatus.ADMIN_APPROVED, BesoinStatus.FORMATION_CREATED);

    /** Tentatives de publication RabbitMQ avant de reporter (retry borné). */
    private static final int PUBLISH_MAX_ATTEMPTS = 3;
    private static final long PUBLISH_RETRY_DELAY_MS = 400L;

    private final BesoinFormationRepository besoinFormationRepository;
    private final BesoinFormationEventPublisher eventPublisher;
    private final NotificationRepository notificationRepository;
    private final BesoinFormationMapper besoinFormationMapper;
    private final ReviewerScopeService reviewerScopeService;
    private final BesoinApprovalHistoryRepository historyRepository;
    private final BesoinCompetenceRepository besoinCompetenceRepository;
    /** Notification e-mail D2F (best-effort, jamais bloquant). */
    private final BesoinFormationMailNotifier mailNotifier;
    /** Producteur optionnel vers l'exchange d2f.notifications (temps réel). */
    private NotificationEventPublisher notificationEventPublisher;

    public BesoinFormationServiceImpl(BesoinFormationRepository besoinFormationRepository,
                                       BesoinFormationEventPublisher eventPublisher,
                                       NotificationRepository notificationRepository,
                                       BesoinFormationMapper besoinFormationMapper,
                                       ReviewerScopeService reviewerScopeService,
                                       BesoinApprovalHistoryRepository historyRepository,
                                       BesoinCompetenceRepository besoinCompetenceRepository,
                                       BesoinFormationMailNotifier mailNotifier) {
        this.besoinFormationRepository = besoinFormationRepository;
        this.eventPublisher = eventPublisher;
        this.notificationRepository = notificationRepository;
        this.besoinFormationMapper = besoinFormationMapper;
        this.reviewerScopeService = reviewerScopeService;
        this.historyRepository = historyRepository;
        this.besoinCompetenceRepository = besoinCompetenceRepository;
        this.mailNotifier = mailNotifier;
    }

    /** Injection optionnelle : les tests unitaires construisent le service sans broker. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setNotificationEventPublisher(NotificationEventPublisher notificationEventPublisher) {
        this.notificationEventPublisher = notificationEventPublisher;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    @Override
    public Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable) {
        // Visibilité stricte : CUP → son UP, chef → son département.
        // Les autres rôles autorisés (ADMIN global, ANIMATEUR, RESPONSABLE)
        // conservent la vue complète.
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (!scope.global() && scope.actorRole() == CreatorRole.CUP) {
            return besoinFormationRepository.findByUpAndStatusNotIn(
                            scope.upCode(), APPROVED_FINAL_STATUSES, pageable)
                    .map(besoinFormationMapper::toResponse);
        }
        if (!scope.global() && scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT) {
            return besoinFormationRepository.findByDepartementAndStatusNotIn(
                            scope.departmentCode(), APPROVED_FINAL_STATUSES, pageable)
                    .map(besoinFormationMapper::toResponse);
        }
        return besoinFormationRepository.findByStatusNotIn(APPROVED_FINAL_STATUSES, pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public BesoinFormationResponse retrieveBesoinFormation(long idBesoinFormation) {
        // Use ResourceNotFoundException → 404 (not IllegalArgumentException → 400)
        BesoinFormation b = besoinFormationRepository.findById(idBesoinFormation)
                .orElseThrow(() -> new ResourceNotFoundException(
                        BESOIN_FORMATION_WITH_ID_PREFIX + idBesoinFormation + NOT_FOUND_SUFFIX));
        // Visibilité stricte CUP/chef : 403 hors périmètre (pas de 404 menteur).
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (!scope.global()
                && (scope.actorRole() == CreatorRole.CUP
                    || scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT)) {
            reviewerScopeService.ensureInScope(scope, b.getUp(), b.getDepartement(),
                    b.getIdBesoinFormation());
        }
        return besoinFormationMapper.toResponse(b);
    }

    // ── Création ──────────────────────────────────────────────────────────────
    //
    // Le rôle du créateur, son UP et son département sont déterminés côté
    // serveur (JWT + reviewer_scope). Les valeurs up/departement/typeBesoin/
    // username envoyées par le frontend sont vérifiées ou recalculées.

    @Override
    @Transactional
    public BesoinFormationResponse addBesoinFormation(BesoinFormationRequest request) {
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        validateTypeBesoin(request.getTypeBesoin());

        BesoinFormation b = besoinFormationMapper.toEntity(request);
        // Identité du créateur : TOUJOURS depuis le JWT, jamais depuis le body.
        b.setUsername(scope.username());
        b.setCreatedByUserId(scope.userId());
        b.setCreatedByRole(scope.actorRole());
        b.setStatus(BesoinStatus.SUBMITTED);
        b.setEventPublished(false);

        switch (scope.actorRole()) {
            case ENSEIGNANT -> {
                requireUpAndDepartement(scope.upCode(), scope.departmentCode());
                b.setUp(scope.upCode());
                b.setDepartement(scope.departmentCode());
                b.setCurrentApprovalStep(ApprovalStep.CUP);
            }
            case CUP -> {
                // UP + département recalculés depuis le périmètre serveur.
                requireUpAndDepartement(scope.upCode(), scope.departmentCode());
                b.setUp(scope.upCode());
                b.setDepartement(scope.departmentCode());
                b.setCurrentApprovalStep(ApprovalStep.CHEF_DEPARTEMENT);
            }
            case CHEF_DEPARTEMENT -> {
                b.setUp(null);
                b.setDepartement(scope.departmentCode());
                b.setCurrentApprovalStep(ApprovalStep.ADMIN);
            }
            case ADMIN -> {
                if (request.getTypeBesoin() == TypeBesoin.COLLECTIF) {
                    if (request.getDepartement() == null || request.getDepartement().isBlank()) {
                        throw new IllegalArgumentException(
                                "Le département est obligatoire pour un besoin collectif.");
                    }
                    b.setUp(request.getUp());
                    b.setDepartement(request.getDepartement());
                    b.setCurrentApprovalStep(ApprovalStep.CHEF_DEPARTEMENT);
                } else {
                    requireUpAndDepartement(request.getUp(), request.getDepartement());
                    b.setUp(request.getUp());
                    b.setDepartement(request.getDepartement());
                    b.setCurrentApprovalStep(ApprovalStep.CUP);
                }
            }
        }

        BesoinFormation saved = besoinFormationRepository.save(b);
        recordHistory(saved, scope.username(), scope.actorRole().name(),
                WorkflowAction.CREATE, null, saved.getCurrentApprovalStep(), null);
        log.info("Besoin {} créé par '{}' ({}) — étape initiale {}", saved.getIdBesoinFormation(),
                scope.username(), scope.actorRole(), saved.getCurrentApprovalStep());
        // DSI §: e-mail au D2F lorsqu'un besoin est ajouté par le CUP ou le chef.
        notifyD2FIfNeeded(saved, scope, "ajouté");
        return besoinFormationMapper.toResponse(saved);
    }

    private void validateTypeBesoin(TypeBesoin type) {
        if (type == null) {
            throw new IllegalArgumentException("Le type de besoin est obligatoire.");
        }
        // ENSEIGNANT / CUP / CHEF_DEPARTEMENT / ADMIN : INDIVIDUEL et COLLECTIF
        // acceptés — seul le type null est rejeté (contrainte @NotNull miroir).
    }

    private void requireUpAndDepartement(String up, String departement) {
        if (up == null || up.isBlank() || departement == null || departement.isBlank()) {
            throw new IllegalArgumentException(
                    "L'UP et le département sont obligatoires pour un besoin individuel.");
        }
    }

    // ── Modification / Suppression ────────────────────────────────────────────

    @Override
    @Transactional
    public void removeBesoinFormation(long idBesoinFormation) {
        BesoinFormation b = besoinFormationRepository.findById(idBesoinFormation)
                .orElseThrow(() -> new ResourceNotFoundException(
                BESOIN_FORMATION_WITH_ID_PREFIX + idBesoinFormation + NOT_FOUND_SUFFIX));
        ensureCanWriteOrAdmin(b);
        // Fix 5: Soft delete — ne jamais hard-delete un besoin
        b.setDeletedAt(Instant.now());
        besoinFormationRepository.save(b);
        log.info("BesoinFormation {} soft-deleted", idBesoinFormation);
    }

    @Override
    @Transactional
    public BesoinFormationResponse modifyBesoinFormation(BesoinFormationRequest b) {
        // Use ResourceNotFoundException (→ 404) instead of bare orElseThrow() (→ 500)
        BesoinFormation existing = besoinFormationRepository.findById(b.getIdBesoinFormation())
                .orElseThrow(() -> new ResourceNotFoundException(
                BESOIN_FORMATION_WITH_ID_PREFIX + b.getIdBesoinFormation() + NOT_FOUND_SUFFIX));
        ensureCanWriteOrAdmin(existing);
        updateDataFields(b, existing);
        // SÉCURITÉ : les flags d'approbation ne transitent QUE par
        // /approve et /reject — toute valeur reçue ici est ignorée.
        if (b.getApprouveCUP() != null || b.getApprouveChefDep() != null || b.getApprouveAdmin() != null) {
            log.warn("PUT modify besoin {} : flags d'approbation ignorés (utiliser /approve ou /reject)",
                    existing.getIdBesoinFormation());
        }
        handleNotifications(existing, b.getCommentaire());
        // DSI §: e-mail au D2F lorsqu'un besoin est modifié par le CUP ou le chef.
        notifyD2FIfNeeded(existing, reviewerScopeService.resolveCurrentUser(), "modifié");
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(existing));
    }

    // ── Workflow d'approbation / refus ────────────────────────────────────────

    /** Contexte de décision validé, partagé par approve et reject. */
    private record Decision(BesoinFormation besoin, ResolvedScope scope, ApprovalStep step) {
    }

    @Override
    @Transactional
    public BesoinFormationResponse approuverBesoin(Long id) {
        Decision decision = checkDecision(id, "approuver");
        BesoinFormation b = decision.besoin();
        ResolvedScope scope = decision.scope();
        ApprovalStep step = decision.step();

        switch (step) {
            case CUP -> {
                b.setApprouveCUP(true);
                b.setApprovedByCup(scope.username());
                b.setStatus(BesoinStatus.CUP_APPROVED);
                b.setCurrentApprovalStep(ApprovalStep.CHEF_DEPARTEMENT);
            }
            case CHEF_DEPARTEMENT -> {
                b.setApprouveChefDep(true);
                b.setApprovedByChefDepartement(scope.username());
                b.setStatus(BesoinStatus.DEPARTMENT_APPROVED);
                b.setCurrentApprovalStep(ApprovalStep.ADMIN);
            }
            case ADMIN -> {
                b.setApprouveAdmin(true);
                b.setApprovedByAdmin(scope.username());
                b.setStatus(BesoinStatus.ADMIN_APPROVED);
                if (publishApprovalEventWithRetry(b, scope.username())) {
                    b.setEventPublished(true);
                    b.setStatus(BesoinStatus.FORMATION_CREATED);
                    b.setCurrentApprovalStep(ApprovalStep.COMPLETED);
                }
                // En cas d'échec de publication : le besoin reste ADMIN_APPROVED,
                // non publié — le scheduler republie (retry différé, §7).
            }
            default -> throw new InvalidWorkflowTransitionException(
                    "Transition invalide : étape " + step + " non traitable.");
        }

        BesoinFormation saved = besoinFormationRepository.save(b);
        recordHistory(saved, scope.username(), scope.actorRole().name(),
                WorkflowAction.APPROVE, step, saved.getCurrentApprovalStep(), null);
        log.info("Besoin {} approuvé à l'étape {} par '{}' ({})", id, step,
                scope.username(), scope.actorRole());
        if (saved.getStatus() == BesoinStatus.FORMATION_CREATED && saved.getUsername() != null) {
            createNotification(saved.getUsername(),
                    "Votre demande de formation a été acceptée. Veuillez contacter les formateurs.", null);
        }
        return besoinFormationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public BesoinFormationResponse refuserBesoin(Long id, String motif) {
        if (motif == null || motif.isBlank()) {
            throw new IllegalArgumentException("Le motif du refus est obligatoire.");
        }
        Decision decision = checkDecision(id, "refuser");
        BesoinFormation b = decision.besoin();
        ResolvedScope scope = decision.scope();
        ApprovalStep step = decision.step();

        // Le refus fige le flag de l'étape courante à FALSE (cohérent avec
        // l'historique : handleNotifications notifie sur approuveCUP == false).
        switch (step) {
            case CUP -> b.setApprouveCUP(false);
            case CHEF_DEPARTEMENT -> b.setApprouveChefDep(false);
            case ADMIN -> b.setApprouveAdmin(false);
            default -> throw new InvalidWorkflowTransitionException(
                    "Transition invalide : étape " + step + " non traitable.");
        }
        b.setStatus(BesoinStatus.REJECTED);
        b.setCurrentApprovalStep(ApprovalStep.REJECTED);
        b.setRejectionReason(motif.strip());
        b.setRejectedBy(scope.username());
        b.setRejectedAt(Instant.now());

        BesoinFormation saved = besoinFormationRepository.save(b);
        recordHistory(saved, scope.username(), scope.actorRole().name(),
                WorkflowAction.REJECT, step, ApprovalStep.REJECTED, motif.strip());
        log.info("Besoin {} refusé à l'étape {} par '{}' ({}) — motif : {}", id, step,
                scope.username(), scope.actorRole(), motif.strip());
        if (saved.getUsername() != null) {
            createNotification(saved.getUsername(),
                    "Votre demande de formation a été refusée.", motif.strip());
        }
        return besoinFormationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public BesoinFormationResponse annulerBesoin(Long id) {
        BesoinFormation b = besoinFormationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        BESOIN_FORMATION_WITH_ID_PREFIX + id + NOT_FOUND_SUFFIX));
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        boolean owner = isCreator(b, scope);
        if (!owner && scope.actorRole() != CreatorRole.ADMIN) {
            throw new AccessDeniedException("Vous ne pouvez annuler que vos propres besoins de formation.");
        }
        if (b.getStatus() != BesoinStatus.SUBMITTED) {
            throw new InvalidWorkflowTransitionException(
                    "Annulation impossible : le besoin n°" + id + " a déjà quitté l'étape de soumission.");
        }
        ApprovalStep from = effectiveStep(b);
        b.setStatus(BesoinStatus.CANCELLED);
        b.setCurrentApprovalStep(ApprovalStep.REJECTED);
        BesoinFormation saved = besoinFormationRepository.save(b);
        recordHistory(saved, scope.username(), scope.actorRole().name(),
                WorkflowAction.CANCEL, from, ApprovalStep.REJECTED, "Annulé par le créateur");
        log.info("Besoin {} annulé par '{}'", id, scope.username());
        return besoinFormationMapper.toResponse(saved);
    }

    /**
     * Contrôles communs approve/reject (§5) : existence, statut, rôle vs étape,
     * périmètre, créateur ≠ décideur.
     */
    private Decision checkDecision(Long id, String verbe) {
        // §5.9 — verrou pessimiste : sérialise les décisions concurrentes sur le
        // même besoin (double approbation impossible au sein d'une transaction).
        BesoinFormation b = besoinFormationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        BESOIN_FORMATION_WITH_ID_PREFIX + id + NOT_FOUND_SUFFIX));
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();

        // 4. Statut compatible (terminal → 409).
        if (b.getStatus() == BesoinStatus.REJECTED
                || b.getStatus() == BesoinStatus.CANCELLED
                || b.getStatus() == BesoinStatus.FORMATION_CREATED
                || b.getStatus() == BesoinStatus.ADMIN_APPROVED
                || effectiveStep(b) == ApprovalStep.COMPLETED
                || effectiveStep(b) == ApprovalStep.REJECTED) {
            throw new InvalidWorkflowTransitionException(
                    "Transition invalide : le besoin n°" + id + " est déjà traité (statut "
                    + b.getStatus() + ") et ne peut plus être " + (verbe.equals("approuver") ? "approuvé." : "refusé."));
        }

        ApprovalStep step = effectiveStep(b);

        // 8. Le créateur ne décide jamais sur son propre besoin (403) — contrôle
        // AVANT l'étape : même à la « bonne » étape, l'auto-approbation est interdite.
        if (isCreator(b, scope)) {
            throw new AccessDeniedException(
                    "Le créateur d'un besoin ne peut pas " + verbe + " son propre besoin (n°" + id + ").");
        }

        // 5. Étape compatible avec le rôle : 403 si aucun rôle approbateur,
        // 409 si approbateur mais au mauvais stade (ex. chef au stade CUP).
        boolean stepMatches = stepMatchesRole(step, scope.actorRole());
        if (!stepMatches) {
            if (scope.actorRole() == CreatorRole.CUP || scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT) {
                throw new InvalidWorkflowTransitionException(
                        "Transition invalide : ce besoin est au stade " + step
                        + " — un " + scope.actorRole().name() + " ne peut pas le traiter.");
            }
            throw new AccessDeniedException(
                    "Rôle insuffisant pour traiter un besoin au stade " + step + ".");
        }

        // 6-7. Périmètre UP / département (403).
        reviewerScopeService.ensureInScope(scope, b.getUp(), b.getDepartement(), id);

        // Cohérence type/étape : l'étape CUP ne traite que de l'individuel.
        if (step == ApprovalStep.CUP && b.getTypeBesoin() == TypeBesoin.COLLECTIF) {
            throw new InvalidWorkflowTransitionException(
                    "Transition invalide : un besoin collectif ne transite jamais par l'étape CUP.");
        }
        return new Decision(b, scope, step);
    }

    private boolean stepMatchesRole(ApprovalStep step, CreatorRole actorRole) {
        return switch (step) {
            case CUP -> actorRole == CreatorRole.CUP || actorRole == CreatorRole.ADMIN;
            case CHEF_DEPARTEMENT -> actorRole == CreatorRole.CHEF_DEPARTEMENT || actorRole == CreatorRole.ADMIN;
            case ADMIN -> actorRole == CreatorRole.ADMIN;
            default -> false;
        };
    }

    /** Étape effective (repli flags legacy si currentApprovalStep absent). */
    private ApprovalStep effectiveStep(BesoinFormation b) {
        if (b.getCurrentApprovalStep() != null) return b.getCurrentApprovalStep();
        if (!Boolean.TRUE.equals(b.getApprouveCUP())) return ApprovalStep.CUP;
        if (!Boolean.TRUE.equals(b.getApprouveChefDep())) return ApprovalStep.CHEF_DEPARTEMENT;
        if (!Boolean.TRUE.equals(b.getApprouveAdmin())) return ApprovalStep.ADMIN;
        return ApprovalStep.COMPLETED;
    }

    private boolean isCreator(BesoinFormation b, ResolvedScope scope) {
        if (scope.username() != null && scope.username().equals(b.getUsername())) return true;
        return scope.userId() != null && scope.userId().equals(b.getCreatedByUserId());
    }

    // ── Listes scopées ────────────────────────────────────────────────────────

    @Override
    public Page<BesoinFormationResponse> retrievePendingApproval(Pageable pageable) {
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        Page<BesoinFormation> page = switch (scope.actorRole()) {
            case ADMIN ->
                // DSI §: seul le D2F approuve désormais — sa file d'attente
                // couvre TOUS les besoins non terminaux, quelle que soit
                // l'étape initiale (CUP pour les individuels, CHEF_DEPARTEMENT
                // pour les collectifs, ADMIN pour les besoins du chef).
                besoinFormationRepository.findByCurrentApprovalStepIn(
                        List.of(ApprovalStep.CUP, ApprovalStep.CHEF_DEPARTEMENT, ApprovalStep.ADMIN),
                        pageable);
            case CUP -> besoinFormationRepository.findByCurrentApprovalStepAndUp(
                    ApprovalStep.CUP, scope.upCode(), pageable);
            case CHEF_DEPARTEMENT -> besoinFormationRepository.findByCurrentApprovalStepAndDepartement(
                    ApprovalStep.CHEF_DEPARTEMENT, scope.departmentCode(), pageable);
            case ENSEIGNANT -> throw new AccessDeniedException(
                    "La liste des besoins en attente est réservée aux valideurs (CUP, chef, admin).");
        };
        return page.map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveScope(Pageable pageable) {
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        // DSI §: les listes courantes n'exposent plus les besoins approuvés par
        // le D2F (ADMIN_APPROVED / FORMATION_CREATED) — consultation via /approved.
        Page<BesoinFormation> page = switch (scope.actorRole()) {
            case ADMIN -> besoinFormationRepository.findByStatusNotIn(APPROVED_FINAL_STATUSES, pageable);
            case CUP -> besoinFormationRepository.findByUpAndStatusNotIn(
                    scope.upCode(), APPROVED_FINAL_STATUSES, pageable);
            case CHEF_DEPARTEMENT -> besoinFormationRepository.findByDepartementAndStatusNotIn(
                    scope.departmentCode(), APPROVED_FINAL_STATUSES, pageable);
            case ENSEIGNANT -> throw new AccessDeniedException(
                    "Utilisez /mine pour consulter vos propres besoins.");
        };
        return page.map(besoinFormationMapper::toResponse);
    }

    @Override
    public List<BesoinApprovalHistory> getApprovalHistory(Long id) {
        besoinFormationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        BESOIN_FORMATION_WITH_ID_PREFIX + id + NOT_FOUND_SUFFIX));
        return historyRepository.findByBesoinIdOrderByCreatedAtDesc(id);
    }

    // ── Requêtes filtrées (existantes) ────────────────────────────────────────

    @Override
    public Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable) {
        // DSI §: les besoins approuvés par le D2F quittent la liste courante mais
        // restent consultables en LECTURE SEULE via /approved. La consultation
        // respecte le périmètre de l'appelant : CUP → son UP, chef → son
        // département ; les autres rôles habilités (ADMIN, ANIMATEUR,
        // RESPONSABLE_DOSSIER) conservent la vue globale alignée sur leur lecture
        // de la liste courante.
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (!scope.global() && scope.actorRole() == CreatorRole.CUP) {
            return besoinFormationRepository.findByUpAndApprouveAdminTrue(
                    scope.upCode(), pageable).map(besoinFormationMapper::toResponse);
        }
        if (!scope.global() && scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT) {
            return besoinFormationRepository.findByDepartementAndApprouveAdminTrue(
                    scope.departmentCode(), pageable).map(besoinFormationMapper::toResponse);
        }
        return besoinFormationRepository.findByApprouveAdminTrue(pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable) {
        // Anti-énumération inter-UP : le filtre demandé doit appartenir au
        // périmètre de l'appelant (ADMIN global, CUP = son UP). Le chef, dont
        // les besoins collectifs n'ont pas d'UP, est orienté vers /scope.
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (!scope.global() && scope.actorRole() == CreatorRole.CUP
                && (scope.upCode() == null || !scope.upCode().equals(up))) {
            throw new AccessDeniedException(
                    "Périmètre interdit : vous ne pouvez consulter que les besoins de votre UP ("
                    + scope.upCode() + ").");
        }
        if (scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT) {
            throw new AccessDeniedException(
                    "Les besoins collectifs de votre périmètre n'ont pas d'UP : utilisez /scope.");
        }
        if (scope.actorRole() == CreatorRole.ENSEIGNANT) {
            throw new AccessDeniedException("Utilisez /mine pour consulter vos propres besoins.");
        }
        return besoinFormationRepository.findByUp(up, pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable) {
        // Anti-énumération inter-départements : seul l'ADMIN (global) ou le chef
        // de CE département peuvent filtrer. CUP/enseignant → refus.
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (!scope.global() && scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT
                && (scope.departmentCode() == null || !scope.departmentCode().equals(departement))) {
            throw new AccessDeniedException(
                    "Périmètre interdit : vous ne pouvez consulter que les besoins de votre département ("
                    + scope.departmentCode() + ").");
        }
        if (scope.actorRole() == CreatorRole.CUP || scope.actorRole() == CreatorRole.ENSEIGNANT) {
            throw new AccessDeniedException("Utilisez /scope ou /mine selon votre rôle.");
        }
        return besoinFormationRepository.findByDepartement(departement, pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveAllByPriorite(Pageable pageable) {
        return besoinFormationRepository.findAllByOrderByPrioriteDesc(pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByPriorite(Priorite priorite, Pageable pageable) {
        return besoinFormationRepository.findByPriorite(priorite, pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByUsername(String username, Pageable pageable) {
        return besoinFormationRepository.findByUsername(username, pageable)
                .map(besoinFormationMapper::toResponse);
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    /**
     * Vérifie que l'utilisateur courant peut modifier/supprimer le besoin :
     * ADMIN (global), créateur (enseignant/animateur), ou validateur
     * (CUP/chef) si le besoin appartient à son périmètre (UP / département).
     */
    private void ensureCanWriteOrAdmin(BesoinFormation b) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        if (hasRole(authorities, ROLE_ADMIN)) {
            return;
        }
        // DSI §: un besoin approuvé par le D2F (ADMIN_APPROVED / FORMATION_CREATED)
        // est consultable mais NON MODIFIABLE — ni par son créateur, ni par son
        // périmètre (CUP/chef). Seul l'ADMIN conserve la main (correction d'audit).
        if (b.getStatus() == BesoinStatus.ADMIN_APPROVED
                || b.getStatus() == BesoinStatus.FORMATION_CREATED) {
            throw new AccessDeniedException(
                    "Ce besoin a été approuvé par le D2F : il est consultable mais n'est plus modifiable.");
        }
        boolean isOwnerRole = hasRole(authorities, ROLE_ENSEIGNANT) || hasRole(authorities, ROLE_ANIMATEUR);
        if (isOwnerRole && auth.getName() != null && auth.getName().equals(b.getUsername())) {
            return;
        }
        ResolvedScope scope = reviewerScopeService.resolveCurrentUser();
        if (scope.actorRole() == CreatorRole.CUP || scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT) {
            reviewerScopeService.ensureInScope(scope, b.getUp(), b.getDepartement(),
                    b.getIdBesoinFormation());
            return;
        }
        throw new AccessDeniedException("Vous ne pouvez modifier ou supprimer que vos propres besoins de formation.");
    }

    private boolean hasRole(Collection<? extends GrantedAuthority> authorities, String role) {
        return authorities.stream().anyMatch(a -> role.equals(a.getAuthority()));
    }

    private void recordHistory(BesoinFormation b, String actor, String actorRole,
                               WorkflowAction action, ApprovalStep from, ApprovalStep to, String reason) {
        try {
            historyRepository.save(BesoinApprovalHistory.builder()
                    .besoinId(b.getIdBesoinFormation())
                    .actorUsername(actor)
                    .actorRole(actorRole)
                    .action(action)
                    .fromStep(from)
                    .toStep(to)
                    .reason(reason)
                    .build());
        } catch (Exception e) {
            // L'audit ne doit jamais faire échouer la transition métier.
            log.warn("Historique d'audit non persisté pour besoin {} : {}", b.getIdBesoinFormation(), e.getMessage());
        }
    }

    /**
     * Publication RabbitMQ avec retry borné (§7 : retry limité).
     * Retourne true si l'événement est parti ; false sinon — le besoin reste
     * alors ADMIN_APPROVED non publié et le scheduler republie en différé.
     */
    private boolean publishApprovalEventWithRetry(BesoinFormation b, String approvedBy) {
        BesoinFormationApprovedEvent evt = buildApprovalEvent(b, approvedBy);
        for (int attempt = 1; attempt <= PUBLISH_MAX_ATTEMPTS; attempt++) {
            try {
                eventPublisher.publish(evt);
                log.info("BesoinFormationApprovedEvent publié pour besoinId={} (tentative {})",
                        b.getIdBesoinFormation(), attempt);
                return true;
            } catch (Exception e) {
                log.warn("Échec publication événement besoinId={} (tentative {}/{}): {}",
                        b.getIdBesoinFormation(), attempt, PUBLISH_MAX_ATTEMPTS, e.getMessage());
                if (attempt < PUBLISH_MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(PUBLISH_RETRY_DELAY_MS * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.error("Publication impossible après {} tentatives pour besoinId={} — republication différée via scheduler",
                PUBLISH_MAX_ATTEMPTS, b.getIdBesoinFormation());
        return false;
    }

    /**
     * Construit l'événement d'approbation finale.
     * Seules les données nécessaires au service Formation sont incluses.
     * Aucun mot de passe, token ou donnée sensible n'est transmis.
     */
    private BesoinFormationApprovedEvent buildApprovalEvent(BesoinFormation b, String approvedBy) {
        List<Long> competenceIds = List.of();
        try {
            competenceIds = besoinCompetenceRepository.findByBesoinId(b.getIdBesoinFormation()).stream()
                    .map(bc -> bc.getCompetenceId())
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
        } catch (Exception e) {
            log.debug("competenceIds illisibles pour besoin {} : {}", b.getIdBesoinFormation(), e.getMessage());
        }
        return BesoinFormationApprovedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(BesoinFormationApprovedEvent.class.getSimpleName())
                .idBesoinFormation(b.getIdBesoinFormation())
                .username(b.getUsername())                               // identifiant fonctionnel (non-PII)
                .approvedAt(Instant.now().toString())                    // horodatage UTC ISO-8601
                .occurredAt(Instant.now().toString())
                .typeBesoin(b.getTypeBesoin() != null ? b.getTypeBesoin().name() : null)
                .createdByRole(b.getCreatedByRole() != null ? b.getCreatedByRole().name() : null)
                .upId(b.getUp())
                .departmentId(b.getDepartement())
                .competenceIds(competenceIds)
                .approvedBy(approvedBy)
                .titre(b.getTitre())
                .theme(b.getTheme())
                .objectifFormation(b.getObjectifFormation())
                .objectifsOperationnels(b.getObjectifsOperationnels())
                .objectifsPedagogiques(b.getObjectifsPedagogiques())
                .methodesPedagogiques(b.getMethodesPedagogiques())
                .moyensPedagogiques(b.getMoyensPedagogiques())
                .methodesEvaluationAcquis(b.getMethodesEvaluationAcquis())
                .profilFormateur(b.getProfilFormateur())
                .propositionAnimateur(b.getPropositionAnimateur())
                .prerequis(b.getPrerequis())
                .publicCible(b.getPublicCible())
                .nbMaxParticipants(b.getNbMaxParticipants())
                .programmeFormation(b.getProgrammeFormation())
                .dureeFormation(b.getDureeFormation())
                .horaireSouhaite(b.getHoraireSouhaite())
                .up(b.getUp())
                .departement(b.getDepartement())
                .periodCode(b.getPeriodCode() != null ? b.getPeriodCode().name() : null)
                .customPeriodLabel(b.getCustomPeriodLabel())
                .dateDebut(b.getDateDebut())
                .dateFin(b.getDateFin())
                .build();
    }

    /**
     * Republication différée des approbations finales dont l'événement n'est
     * pas parti (broker indisponible au moment du clic admin). Appelée par le
     * scheduler — bornée, idempotente (flag eventPublished).
     */
    @Transactional
    public int republishPendingEvents() {
        List<BesoinFormation> pending = besoinFormationRepository
                .findByStatusAndEventPublishedFalse(BesoinStatus.ADMIN_APPROVED);
        int republished = 0;
        for (BesoinFormation b : pending) {
            String approvedBy = b.getApprovedByAdmin() != null ? b.getApprovedByAdmin() : "scheduler";
            if (publishApprovalEventWithRetry(b, approvedBy)) {
                b.setEventPublished(true);
                b.setStatus(BesoinStatus.FORMATION_CREATED);
                b.setCurrentApprovalStep(ApprovalStep.COMPLETED);
                besoinFormationRepository.save(b);
                republished++;
            }
        }
        if (republished > 0) {
            log.info("Scheduler : {} événement(s) d'approbation republié(s)", republished);
        }
        return republished;
    }

    private void updateDataFields(BesoinFormationRequest src, BesoinFormation dest) {
        copyIfPresent(src::getTitre, BesoinFormation::setTitre, dest);
        copyIfPresent(src::getObjectifFormation, BesoinFormation::setObjectifFormation, dest);
        // SÉCURITÉ : typeBesoin / up / departement figent le routage workflow —
        // modifiables uniquement par l'administrateur (gestion globale).
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean admin = auth != null && hasRole(auth.getAuthorities(), ROLE_ADMIN);
        if (admin) {
            copyIfPresent(src::getTypeBesoin, BesoinFormation::setTypeBesoin, dest);
            copyIfPresent(src::getUp, BesoinFormation::setUp, dest);
            copyIfPresent(src::getDepartement, BesoinFormation::setDepartement, dest);
        } else if (src.getTypeBesoin() != null || src.getUp() != null || src.getDepartement() != null) {
            log.warn("PUT modify : type/up/departement ignorés (réservé à l'admin)");
        }
        copyIfPresent(src::getPriorite, BesoinFormation::setPriorite, dest);
        copyIfPresent(src::getImpactStrategique, BesoinFormation::setImpactStrategique, dest);
        copyIfPresent(src::getPropositionAnimateur, BesoinFormation::setPropositionAnimateur, dest);
        copyIfPresent(src::getHoraireSouhaite, BesoinFormation::setHoraireSouhaite, dest);
        copyIfPresent(src::getEstOuverte, BesoinFormation::setEstOuverte, dest);
        copyIfPresent(src::getAutresInformations, BesoinFormation::setAutresInformations, dest);
        copyIfPresent(src::getAnimateurs, BesoinFormation::setAnimateurs, dest);
        copyIfPresent(src::getEnseignants, BesoinFormation::setEnseignants, dest);
        copyIfPresent(src::getPeriodCode, BesoinFormation::setPeriodCode, dest);
        copyIfPresent(src::getCustomPeriodLabel, BesoinFormation::setCustomPeriodLabel, dest);
        copyDateAsStringIfPresent(src::getDateDebut, BesoinFormation::setDateDebut, dest);
        copyDateAsStringIfPresent(src::getDateFin, BesoinFormation::setDateFin, dest);
    }

    private static <T> void copyIfPresent(Supplier<T> getter, BiConsumer<BesoinFormation, T> setter, BesoinFormation dest) {
        T value = getter.get();
        if (value != null) {
            setter.accept(dest, value);
        }
    }

    private static void copyDateAsStringIfPresent(Supplier<LocalDate> getter, BiConsumer<BesoinFormation, String> setter, BesoinFormation dest) {
        LocalDate value = getter.get();
        if (value != null) {
            setter.accept(dest, value.toString());
        }
    }

    private void handleNotifications(BesoinFormation existing, String commentaire) {
        if (Boolean.FALSE.equals(existing.isApprouveCUP())) {
            createNotification(existing.getUsername(),
                    "Votre demande de formation a été refusée.", commentaire);
        }
        if (Boolean.TRUE.equals(existing.isApprouveAdmin())) {
            createNotification(existing.getUsername(),
                    "Votre demande de formation a été acceptée. Veuillez contacter les formateurs.", commentaire);
        }
    }

    @Transactional(readOnly = true)
    @Override
    public Page<Notification> findNotificationsByUsername(String username, Pageable pageable) {
        return notificationRepository.findByUsername(username, pageable);
    }

    // ── Notification e-mail D2F (ajout / modification par CUP ou chef) ────────

    /**
     * DSI §: le D2F reçoit un e-mail lorsqu'un besoin de formation est ajouté ou
     * modifié par le CUP ou par le chef de département. Best-effort : l'e-mail ne
     * doit jamais faire échouer la transaction métier (exceptions avalées, log).
     */
    private void notifyD2FIfNeeded(BesoinFormation b, ResolvedScope scope, String action) {
        try {
            if (scope != null && (scope.actorRole() == CreatorRole.CUP
                    || scope.actorRole() == CreatorRole.CHEF_DEPARTEMENT)) {
                String actor = scope.username() == null ? "inconnu" : scope.username();
                mailNotifier.notifyD2FBesoinChanged(b, scope.actorRole().name(), action, actor);
            }
        } catch (Exception e) {
            log.warn("Notification e-mail D2F non envoyée pour besoin {} : {}",
                    b.getIdBesoinFormation(), e.getMessage());
        }
    }

    private void createNotification(String username, String message, String commentaire) {
        Notification notif = new Notification();
        notif.setUsername(username);
        notif.setMessage(message);
        notif.setCommentaire(commentaire);
        notificationRepository.save(notif);
        // Temps réel : relaie vers le service notification (best-effort, jamais bloquant).
        if (notificationEventPublisher != null) {
            String title = commentaire != null && !commentaire.isBlank() ? commentaire : "Besoin de formation";
            notificationEventPublisher.publish(username, title, message, null, null);
        }
    }
}

