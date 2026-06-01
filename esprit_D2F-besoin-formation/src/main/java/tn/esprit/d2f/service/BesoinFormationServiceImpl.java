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
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.function.BiConsumer;
import java.util.function.Supplier;

/**
 * Service métier pour la gestion des besoins de formation.
 *
 * <p>Workflow d'approbation 3 niveaux (DSI §workflow) :</p>
 * <ol>
 *   <li>Niveau 1 — CUP (ou ADMIN) : positionne approuveCUP = true</li>
 *   <li>Niveau 2 — CHEF_DEPARTEMENT (ou ADMIN) : positionne approuveChefDep = true</li>
 *   <li>Niveau 3 — ADMIN : positionne approuveAdmin = true → publie l'événement RabbitMQ</li>
 * </ol>
 */
@Slf4j
@Service
public class BesoinFormationServiceImpl implements IBesoinFormationService {

    private static final String ROLE_ADMIN    = "ROLE_ADMIN";
    private static final String ROLE_CUP      = "ROLE_CUP";
    private static final String ROLE_CHEF_DEP = "ROLE_CHEF_DEPARTEMENT";
    private static final String NOT_FOUND_SUFFIX = " not found";
    private static final String BESOIN_FORMATION_WITH_ID_PREFIX = "BesoinFormation with id ";

    private enum ApprovalStep {
        CUP_APPROVAL, CHEF_DEP_APPROVAL, ADMIN_APPROVAL, COMPLETE
    }

    private final BesoinFormationRepository besoinFormationRepository;
    private final BesoinFormationEventPublisher eventPublisher;
    private final NotificationRepository notificationRepository;
    private final BesoinFormationMapper besoinFormationMapper;

    public BesoinFormationServiceImpl(BesoinFormationRepository besoinFormationRepository,
                                      BesoinFormationEventPublisher eventPublisher,
                                      NotificationRepository notificationRepository,
                                      BesoinFormationMapper besoinFormationMapper) {
        this.besoinFormationRepository = besoinFormationRepository;
        this.eventPublisher = eventPublisher;
        this.notificationRepository = notificationRepository;
        this.besoinFormationMapper = besoinFormationMapper;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    @Override
    public Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable) {
        return besoinFormationRepository.findAll(pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public BesoinFormationResponse retrieveBesoinFormation(long idBesoinFormation) {
        // Use ResourceNotFoundException → 404 (not IllegalArgumentException → 400)
        BesoinFormation b = besoinFormationRepository.findById(idBesoinFormation)
                .orElseThrow(() -> new ResourceNotFoundException(
                        BESOIN_FORMATION_WITH_ID_PREFIX + idBesoinFormation + NOT_FOUND_SUFFIX));
        return besoinFormationMapper.toResponse(b);
    }

    // ── Création / Modification / Suppression ─────────────────────────────────

    @Override
    @Transactional
    public BesoinFormationResponse addBesoinFormation(BesoinFormationRequest request) {
        BesoinFormation b = besoinFormationMapper.toEntity(request);
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(b));
    }

    @Override
    @Transactional
    public void removeBesoinFormation(long idBesoinFormation) {
        BesoinFormation b = besoinFormationRepository.findById(idBesoinFormation)
                .orElseThrow(() -> new ResourceNotFoundException(
                BESOIN_FORMATION_WITH_ID_PREFIX + idBesoinFormation + NOT_FOUND_SUFFIX));
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
        updateDataFields(b, existing);
        updateApprovalFields(b, existing);
        handleNotifications(existing, b.getCommentaire());
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(existing));
    }

    // ── Workflow d'approbation 3 niveaux ──────────────────────────────────────

    /**
     * Progresse le workflow d'approbation d'un cran selon le rôle de l'utilisateur courant.
     *
     * <p>Niveau 1 (CUP/ADMIN) → approuveCUP = true<br>
     * Niveau 2 (CHEF_DEPARTEMENT/ADMIN) → approuveChefDep = true<br>
     * Niveau 3 (ADMIN) → approuveAdmin = true + publication de l'événement RabbitMQ</p>
     */
    @Override
    @Transactional
    public BesoinFormationResponse approuverBesoin(Long id) {
        BesoinFormation b = besoinFormationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                BESOIN_FORMATION_WITH_ID_PREFIX + id + NOT_FOUND_SUFFIX));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();

        executeApprovalStep(b, id, auth, authorities);
        return besoinFormationMapper.toResponse(besoinFormationRepository.save(b));
    }

    private void executeApprovalStep(BesoinFormation b, Long id, Authentication auth,
                                      Collection<? extends GrantedAuthority> authorities) {
        boolean isAdmin   = hasRole(authorities, ROLE_ADMIN);
        boolean isCUP     = hasRole(authorities, ROLE_CUP);
        boolean isChefDep = hasRole(authorities, ROLE_CHEF_DEP);

        ApprovalStep step = determineNextApprovalStep(b);
        switch (step) {
            case CUP_APPROVAL -> approveCupStep(b, id, auth, isCUP, isAdmin);
            case CHEF_DEP_APPROVAL -> approveChefDepStep(b, id, auth, isChefDep, isAdmin);
            case ADMIN_APPROVAL -> approveAdminStep(b, id, auth, isAdmin);
            case COMPLETE -> log.info("Besoin {} is already fully approved — no action taken", id);
        }
    }

    private ApprovalStep determineNextApprovalStep(BesoinFormation b) {
        if (!Boolean.TRUE.equals(b.getApprouveCUP())) return ApprovalStep.CUP_APPROVAL;
        if (!Boolean.TRUE.equals(b.getApprouveChefDep())) return ApprovalStep.CHEF_DEP_APPROVAL;
        if (!Boolean.TRUE.equals(b.getApprouveAdmin())) return ApprovalStep.ADMIN_APPROVAL;
        return ApprovalStep.COMPLETE;
    }

    // ── Requêtes filtrées ─────────────────────────────────────────────────────

    @Override
    public Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable) {
        return besoinFormationRepository.findByApprouveAdminTrue(pageable)
                .map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable) {
        return besoinFormationRepository.findByUp(up, pageable).map(besoinFormationMapper::toResponse);
    }

    @Override
    public Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable) {
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

    // ── Helpers privés ────────────────────────────────────────────────────────

    private boolean hasRole(Collection<? extends GrantedAuthority> authorities, String role) {
        return authorities.stream().anyMatch(a -> role.equals(a.getAuthority()));
    }

    private void approveCupStep(BesoinFormation b, Long id, Authentication auth, boolean isCUP, boolean isAdmin) {
        if (!isCUP && !isAdmin) {
            throw new AccessDeniedException(
                    "Étape 1 du workflow : approbation réservée au CUP ou à l'administrateur.");
        }
        b.setApprouveCUP(true);
        log.info("Besoin {} passed step 1 (CUP) by user '{}'", id, auth.getName());
    }

    private void approveChefDepStep(BesoinFormation b, Long id, Authentication auth, boolean isChefDep, boolean isAdmin) {
        if (!isChefDep && !isAdmin) {
            throw new AccessDeniedException(
                    "Étape 2 du workflow : approbation réservée au Chef de Département ou à l'administrateur.");
        }
        b.setApprouveChefDep(true);
        log.info("Besoin {} passed step 2 (ChefDep) by user '{}'", id, auth.getName());
    }

    private void approveAdminStep(BesoinFormation b, Long id, Authentication auth, boolean isAdmin) {
        if (!isAdmin) {
            throw new AccessDeniedException(
                    "Étape 3 du workflow : approbation finale réservée à l'administrateur.");
        }
        b.setApprouveAdmin(true);
        log.info("Besoin {} fully approved (step 3 Admin) by user '{}'", id, auth.getName());
        publishApprovalEventIfNeeded(b);
    }

    private void publishApprovalEventIfNeeded(BesoinFormation b) {
        // Publier l'événement une seule fois (idempotence via eventPublished)
        if (!Boolean.TRUE.equals(b.getEventPublished())) {
            publishApprovalEvent(b);
            b.setEventPublished(true);
        }
    }

    /**
     * Construit et publie l'événement d'approbation.
     * Seules les données nécessaires au service Formation sont incluses.
     * Aucun mot de passe, token ou donnée PII superflue n'est transmis.
     */
    private void publishApprovalEvent(BesoinFormation b) {
        BesoinFormationApprovedEvent evt = BesoinFormationApprovedEvent.builder()
                .idBesoinFormation(b.getIdBesoinFormation())
                .username(b.getUsername())                               // identifiant fonctionnel (non-PII)
                .approvedAt(Instant.now().toString())                    // horodatage UTC ISO-8601
                .typeBesoin(b.getTypeBesoin() != null ? b.getTypeBesoin().name() : null)
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
        try {
            eventPublisher.publish(evt);
            // Log only non-sensitive identifiers — never log the full event object
            log.info("BesoinFormationApprovedEvent published for besoinId={}", b.getIdBesoinFormation());
        } catch (Exception e) {
            // Resilience4j Circuit Breaker is applied at the publisher level
            log.error("Failed to publish BesoinFormationApprovedEvent for besoinId={}: {}",
                    b.getIdBesoinFormation(), e.getMessage());
        }
    }

    private void updateDataFields(BesoinFormationRequest src, BesoinFormation dest) {
        copyIfPresent(src::getTitre, BesoinFormation::setTitre, dest);
        copyIfPresent(src::getObjectifFormation, BesoinFormation::setObjectifFormation, dest);
        copyIfPresent(src::getTypeBesoin, BesoinFormation::setTypeBesoin, dest);
        copyIfPresent(src::getPriorite, BesoinFormation::setPriorite, dest);
        copyIfPresent(src::getImpactStrategique, BesoinFormation::setImpactStrategique, dest);
        copyIfPresent(src::getPropositionAnimateur, BesoinFormation::setPropositionAnimateur, dest);
        copyIfPresent(src::getHoraireSouhaite, BesoinFormation::setHoraireSouhaite, dest);
        copyIfPresent(src::getUp, BesoinFormation::setUp, dest);
        copyIfPresent(src::getDepartement, BesoinFormation::setDepartement, dest);
        copyIfPresent(src::getEstOuverte, BesoinFormation::setEstOuverte, dest);
        copyIfPresent(src::getAutresInformations, BesoinFormation::setAutresInformations, dest);
        copyIfPresent(src::getAnimateurs, BesoinFormation::setAnimateurs, dest);
        copyIfPresent(src::getEnseignants, BesoinFormation::setEnseignants, dest);
        copyIfPresent(src::getPeriodCode, BesoinFormation::setPeriodCode, dest);
        copyIfPresent(src::getCustomPeriodLabel, BesoinFormation::setCustomPeriodLabel, dest);
        copyDateAsStringIfPresent(src::getDateDebut, BesoinFormation::setDateDebut, dest);
        copyDateAsStringIfPresent(src::getDateFin, BesoinFormation::setDateFin, dest);
    }

    private void updateApprovalFields(BesoinFormationRequest src, BesoinFormation dest) {
        copyIfPresent(src::getApprouveCUP, BesoinFormation::setApprouveCUP, dest);
        copyIfPresent(src::getApprouveChefDep, BesoinFormation::setApprouveChefDep, dest);
        copyIfPresent(src::getApprouveAdmin, BesoinFormation::setApprouveAdmin, dest);
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

    private void createNotification(String username, String message, String commentaire) {
        Notification notif = new Notification();
        notif.setUsername(username);
        notif.setMessage(message);
        notif.setCommentaire(commentaire);
        notificationRepository.save(notif);
    }
}

