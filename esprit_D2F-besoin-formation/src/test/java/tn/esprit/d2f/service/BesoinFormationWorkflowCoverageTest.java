package tn.esprit.d2f.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinApprovalHistory;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.exception.InvalidWorkflowTransitionException;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinApprovalHistoryRepository;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Coverage tests — workflow d'approbation, listes scopées, scheduler.
 * Cible les branches non couvertes de BesoinFormationServiceImpl.
 */
@ExtendWith(MockitoExtension.class)
class BesoinFormationWorkflowCoverageTest {

    @Mock
    private BesoinFormationRepository besoinFormationRepository;
    @Mock
    private BesoinFormationEventPublisher eventPublisher;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private ReviewerScopeService reviewerScopeService;
    @Mock
    private BesoinApprovalHistoryRepository historyRepository;
    @Mock
    private BesoinCompetenceRepository besoinCompetenceRepository;

    private final BesoinFormationMapper besoinFormationMapper = new BesoinFormationMapper();

    private BesoinFormationServiceImpl service;

    private static final ReviewerScopeService.ResolvedScope ADMIN_SCOPE =
            new ReviewerScopeService.ResolvedScope("test-admin", "test-admin", CreatorRole.ADMIN, null, null, true);
    private static final ReviewerScopeService.ResolvedScope CUP_SCOPE =
            new ReviewerScopeService.ResolvedScope("cup-user", "cup-user", CreatorRole.CUP, "UP_INFO", "DEPT_GL", false);
    private static final ReviewerScopeService.ResolvedScope CHEF_SCOPE =
            new ReviewerScopeService.ResolvedScope("chef-user", "chef-user", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false);
    private static final ReviewerScopeService.ResolvedScope ENS_SCOPE =
            new ReviewerScopeService.ResolvedScope("ens-user", "ens-user", CreatorRole.ENSEIGNANT, "UP_INFO", "DEPT_GL", false);

    private BesoinFormation besoin(Long id, String username, BesoinStatus status, ApprovalStep step) {
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(id);
        b.setUsername(username);
        b.setStatus(status);
        b.setCurrentApprovalStep(step);
        b.setTitre("Titre " + id);
        b.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        b.setNbMaxParticipants(20);
        b.setDureeFormation(10);
        return b;
    }

    /** Mock save qui affecte un id généré (comportement JPA). */
    private void stubSaveAssignsId() {
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenAnswer(inv -> {
            BesoinFormation toSave = inv.getArgument(0);
            if (toSave.getIdBesoinFormation() == null) {
                toSave.setIdBesoinFormation(777L);
            }
            return toSave;
        });
    }

    @BeforeEach
    void setUp() {
        service = new BesoinFormationServiceImpl(
                besoinFormationRepository,
                eventPublisher,
                notificationRepository,
                besoinFormationMapper,
                reviewerScopeService,
                historyRepository,
                besoinCompetenceRepository
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test-admin", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                )
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── addBesoinFormation : branches CUP / CHEF / ENSEIGNANT ────────────────

    @Test
    void addBesoinFormation_cupCollectif_etapeChef() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        stubSaveAssignsId();

        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Besoin CUP");

        BesoinFormationResponse response = service.addBesoinFormation(request);
        assertEquals(BesoinStatus.SUBMITTED, response.getStatus());
        assertEquals(ApprovalStep.CHEF_DEPARTEMENT, response.getCurrentApprovalStep());
        assertEquals("UP_INFO", response.getUp());
    }

    @Test
    void addBesoinFormation_cupIndividuel_doitEtreRefuse() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addBesoinFormation(request));
        assertTrue(ex.getMessage().contains("collectif"));
    }

    @Test
    void addBesoinFormation_chefCollectif_etapeAdmin() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);
        stubSaveAssignsId();

        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Besoin CHEF");

        BesoinFormationResponse response = service.addBesoinFormation(request);
        assertEquals(ApprovalStep.ADMIN, response.getCurrentApprovalStep());
        assertEquals("DEPT_GL", response.getDepartement());
        assertNull(response.getUp());
    }

    @Test
    void addBesoinFormation_enseignantIndividuel_etapeCup() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        stubSaveAssignsId();

        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        request.setTitre("Besoin ENS");

        BesoinFormationResponse response = service.addBesoinFormation(request);
        assertEquals(ApprovalStep.CUP, response.getCurrentApprovalStep());
        assertEquals("ens-user", response.getUsername());
    }

    @Test
    void addBesoinFormation_enseignantCollectif_doitEtreRefuse() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.addBesoinFormation(request));
        assertTrue(ex.getMessage().contains("individuel"));
    }

    @Test
    void addBesoinFormation_typeNull_doitEtreRefuse() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        BesoinFormationRequest request = new BesoinFormationRequest();
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addBesoinFormation(request));
        assertTrue(ex.getMessage().contains("type de besoin"));
    }

    @Test
    void addBesoinFormation_adminCollectif_sansDepartement_refuse() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setUp("UP_INFO");
        // departement absent
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addBesoinFormation(request));
        assertTrue(ex.getMessage().contains("département est obligatoire"));
    }

    @Test
    void addBesoinFormation_adminIndividuel_sansUp_refuse() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        // up + departement absents
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addBesoinFormation(request));
        assertTrue(ex.getMessage().contains("UP et le département"));
    }

    // ── approuverBesoin : 3 étapes ───────────────────────────────────────────

    @Test
    void approuverBesoin_etapeCup() {
        BesoinFormation b = besoin(5L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.approuverBesoin(5L);
        assertEquals(BesoinStatus.CUP_APPROVED, response.getStatus());
        assertEquals(ApprovalStep.CHEF_DEPARTEMENT, response.getCurrentApprovalStep());
        assertTrue(b.getApprouveCUP());
        verify(historyRepository).save(any(BesoinApprovalHistory.class));
    }

    @Test
    void approuverBesoin_etapeChef() {
        BesoinFormation b = besoin(6L, "ens-user", BesoinStatus.CUP_APPROVED, ApprovalStep.CHEF_DEPARTEMENT);
        when(besoinFormationRepository.findByIdForUpdate(6L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.approuverBesoin(6L);
        assertEquals(BesoinStatus.DEPARTMENT_APPROVED, response.getStatus());
        assertEquals(ApprovalStep.ADMIN, response.getCurrentApprovalStep());
        assertTrue(b.getApprouveChefDep());
    }

    @Test
    void approuverBesoin_etapeAdmin_publieEtComplete() {
        BesoinFormation b = besoin(7L, "ens-user", BesoinStatus.DEPARTMENT_APPROVED, ApprovalStep.ADMIN);
        when(besoinFormationRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinCompetenceRepository.findByBesoinId(7L)).thenReturn(List.of());
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.approuverBesoin(7L);
        assertEquals(BesoinStatus.FORMATION_CREATED, response.getStatus());
        assertEquals(ApprovalStep.COMPLETED, response.getCurrentApprovalStep());
        assertTrue(b.getEventPublished());
        verify(eventPublisher).publish(any());
        verify(notificationRepository).save(any());
    }

    @Test
    void approuverBesoin_etapeAdmin_publicationEchoue_resteAdminApproved() {
        BesoinFormation b = besoin(8L, "ens-user", BesoinStatus.DEPARTMENT_APPROVED, ApprovalStep.ADMIN);
        when(besoinFormationRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinCompetenceRepository.findByBesoinId(8L)).thenReturn(List.of());
        doThrow(new RuntimeException("broker down"))
                .doThrow(new RuntimeException("broker down"))
                .doThrow(new RuntimeException("broker down"))
                .when(eventPublisher).publish(any());
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.approuverBesoin(8L);
        assertEquals(BesoinStatus.ADMIN_APPROVED, response.getStatus());
        assertFalse(b.getEventPublished());
        verify(eventPublisher, times(3)).publish(any());
    }

    @Test
    void approuverBesoin_statutTerminal_doitLever409() {
        BesoinFormation b = besoin(9L, "ens-user", BesoinStatus.FORMATION_CREATED, ApprovalStep.COMPLETED);
        when(besoinFormationRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);

        assertThrows(InvalidWorkflowTransitionException.class, () -> service.approuverBesoin(9L));
    }

    @Test
    void approuverBesoin_createurNePeutPasApprouverSonBesoin() {
        BesoinFormation b = besoin(10L, "cup-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.approuverBesoin(10L));
        assertTrue(ex.getMessage().contains("propre besoin"));
    }

    @Test
    void approuverBesoin_mauvaiseEtapePourRole_doitLever409() {
        BesoinFormation b = besoin(11L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);

        assertThrows(InvalidWorkflowTransitionException.class, () -> service.approuverBesoin(11L));
    }

    @Test
    void approuverBesoin_roleInsuffisant_doitLever403() {
        BesoinFormation b = besoin(12L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);

        assertThrows(AccessDeniedException.class, () -> service.approuverBesoin(12L));
    }

    @Test
    void approuverBesoin_inexistant_doitLever404() {
        when(besoinFormationRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.approuverBesoin(99L));
    }

    // ── refuserBesoin ────────────────────────────────────────────────────────

    @Test
    void refuserBesoin_etapeCup_figefalseEtRejette() {
        BesoinFormation b = besoin(13L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.refuserBesoin(13L, "Non pertinent");
        assertEquals(BesoinStatus.REJECTED, response.getStatus());
        assertEquals(ApprovalStep.REJECTED, response.getCurrentApprovalStep());
        assertFalse(b.getApprouveCUP());
        assertEquals("Non pertinent", b.getRejectionReason());
        verify(notificationRepository).save(any());
    }

    @Test
    void refuserBesoin_sansMotif_refuse() {
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class,
                () -> service.refuserBesoin(1L, null));
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> service.refuserBesoin(1L, "  "));
        assertNotNull(ex1);
        assertNotNull(ex2);
    }

    @Test
    void refuserBesoin_etapeAdmin() {
        BesoinFormation b = besoin(14L, "ens-user", BesoinStatus.DEPARTMENT_APPROVED, ApprovalStep.ADMIN);
        when(besoinFormationRepository.findByIdForUpdate(14L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.refuserBesoin(14L, "Budget");
        assertEquals(BesoinStatus.REJECTED, response.getStatus());
        assertFalse(b.getApprouveAdmin());
    }

    // ── annulerBesoin ────────────────────────────────────────────────────────

    @Test
    void annulerBesoin_createurSoumis_annule() {
        BesoinFormation b = besoin(15L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findById(15L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.annulerBesoin(15L);
        assertEquals(BesoinStatus.CANCELLED, response.getStatus());
    }

    @Test
    void annulerBesoin_horsSoumission_doitLever409() {
        BesoinFormation b = besoin(16L, "ens-user", BesoinStatus.CUP_APPROVED, ApprovalStep.CHEF_DEPARTEMENT);
        when(besoinFormationRepository.findById(16L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        assertThrows(InvalidWorkflowTransitionException.class, () -> service.annulerBesoin(16L));
    }

    @Test
    void annulerBesoin_parAutreQueLeCreateur_doitLever403() {
        BesoinFormation b = besoin(17L, "someone-else", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findById(17L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        assertThrows(AccessDeniedException.class, () -> service.annulerBesoin(17L));
    }

    @Test
    void annulerBesoin_adminPeutAnnulerToutBesoinSoumis() {
        BesoinFormation b = besoin(18L, "someone-else", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findById(18L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.annulerBesoin(18L);
        assertEquals(BesoinStatus.CANCELLED, response.getStatus());
    }

    // ── Listes scopées ───────────────────────────────────────────────────────

    @Test
    void retrievePendingApproval_admin() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByCurrentApprovalStep(ApprovalStep.ADMIN, pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Page<BesoinFormationResponse> result = service.retrievePendingApproval(pageable);
        assertEquals(0, result.getTotalElements());
        verify(besoinFormationRepository).findByCurrentApprovalStep(ApprovalStep.ADMIN, pageable);
    }

    @Test
    void retrievePendingApproval_cup() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByCurrentApprovalStepAndUp(
                ApprovalStep.CUP, "UP_INFO", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        service.retrievePendingApproval(pageable);
        verify(besoinFormationRepository).findByCurrentApprovalStepAndUp(
                ApprovalStep.CUP, "UP_INFO", pageable);
    }

    @Test
    void retrievePendingApproval_chef() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByCurrentApprovalStepAndDepartement(
                ApprovalStep.CHEF_DEPARTEMENT, "DEPT_GL", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        service.retrievePendingApproval(pageable);
        verify(besoinFormationRepository).findByCurrentApprovalStepAndDepartement(
                ApprovalStep.CHEF_DEPARTEMENT, "DEPT_GL", pageable);
    }

    @Test
    void retrievePendingApproval_enseignant_doitLever403() {
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        Pageable pageable = PageRequest.of(0, 10);
        assertThrows(AccessDeniedException.class,
                () -> service.retrievePendingApproval(pageable));
    }

    @Test
    void retrieveScope_parRole() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findAll(pageable)).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByUp("UP_INFO", pageable)).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByDepartement("DEPT_GL", pageable)).thenReturn(new PageImpl<>(Collections.emptyList()));

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        service.retrieveScope(pageable);
        verify(besoinFormationRepository).findAll(pageable);

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);
        service.retrieveScope(pageable);
        verify(besoinFormationRepository).findByUp("UP_INFO", pageable);

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);
        service.retrieveScope(pageable);
        verify(besoinFormationRepository).findByDepartement("DEPT_GL", pageable);

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ENS_SCOPE);
        assertThrows(AccessDeniedException.class, () -> service.retrieveScope(pageable));
    }

    @Test
    void getApprovalHistory_besoinExistant() {
        BesoinFormation b = besoin(19L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findById(19L)).thenReturn(Optional.of(b));
        when(historyRepository.findByBesoinIdOrderByCreatedAtDesc(19L))
                .thenReturn(List.of(new BesoinApprovalHistory()));

        assertEquals(1, service.getApprovalHistory(19L).size());
    }

    @Test
    void getApprovalHistory_besoinInexistant_doitLever404() {
        when(besoinFormationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.getApprovalHistory(99L));
    }

    // ── Requêtes filtrées ────────────────────────────────────────────────────

    @Test
    void requetesFiltrees() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByApprouveAdminTrue(pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByUp("UP_INFO", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByDepartement("DEPT_GL", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findAllByOrderByPrioriteDesc(pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByPriorite(tn.esprit.d2f.entity.enumerations.Priorite.HAUTE, pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(besoinFormationRepository.findByUsername("ens-user", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        assertEquals(0, service.retrieveApprovedBesoinFormations(pageable).getTotalElements());
        assertEquals(0, service.retrieveByUp("UP_INFO", pageable).getTotalElements());
        assertEquals(0, service.retrieveByDepartement("DEPT_GL", pageable).getTotalElements());
        assertEquals(0, service.retrieveAllByPriorite(pageable).getTotalElements());
        assertEquals(0, service.retrieveByPriorite(
                tn.esprit.d2f.entity.enumerations.Priorite.HAUTE, pageable).getTotalElements());
        assertEquals(0, service.retrieveByUsername("ens-user", pageable).getTotalElements());
    }

    // ── removeBesoinFormation / findNotifications ────────────────────────────

    @Test
    void removeBesoinFormation_softDelete() {
        BesoinFormation b = besoin(20L, "test-admin", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        when(besoinFormationRepository.findById(20L)).thenReturn(Optional.of(b));
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.removeBesoinFormation(20L);
        assertNotNull(b.getDeletedAt());
    }

    @Test
    void removeBesoinFormation_inexistant_doitLever404() {
        when(besoinFormationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.removeBesoinFormation(99L));
    }

    @Test
    void findNotificationsByUsername() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUsername("ens-user", pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        assertEquals(0, service.findNotificationsByUsername("ens-user", pageable).getTotalElements());
    }

    // ── republishPendingEvents (scheduler) ──────────────────────────────────

    @Test
    void republishPendingEvents_republieLesApprovalsNonPublies() {
        BesoinFormation pending = besoin(21L, "ens-user", BesoinStatus.ADMIN_APPROVED, ApprovalStep.ADMIN);
        pending.setApprovedByAdmin("admin-user");
        when(besoinFormationRepository.findByStatusAndEventPublishedFalse(BesoinStatus.ADMIN_APPROVED))
                .thenReturn(List.of(pending));
        when(besoinCompetenceRepository.findByBesoinId(21L)).thenReturn(List.of());
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        int republished = service.republishPendingEvents();
        assertEquals(1, republished);
        assertTrue(pending.getEventPublished());
        assertEquals(BesoinStatus.FORMATION_CREATED, pending.getStatus());
    }

    @Test
    void republishPendingEvents_aucunPending() {
        when(besoinFormationRepository.findByStatusAndEventPublishedFalse(BesoinStatus.ADMIN_APPROVED))
                .thenReturn(List.of());
        assertEquals(0, service.republishPendingEvents());
    }

    @Test
    void republishPendingEvents_publicationEchoue_resteEnAttente() {
        BesoinFormation pending = besoin(22L, "ens-user", BesoinStatus.ADMIN_APPROVED, ApprovalStep.ADMIN);
        when(besoinFormationRepository.findByStatusAndEventPublishedFalse(BesoinStatus.ADMIN_APPROVED))
                .thenReturn(List.of(pending));
        when(besoinCompetenceRepository.findByBesoinId(22L)).thenReturn(List.of());
        doThrow(new RuntimeException("down")).when(eventPublisher).publish(any());

        int republished = service.republishPendingEvents();
        assertEquals(0, republished);
        assertFalse(pending.getEventPublished());
        assertEquals(BesoinStatus.ADMIN_APPROVED, pending.getStatus());
    }

    // ── Repli legacy effectiveStep (currentApprovalStep null) ─────────────────

    @Test
    void approuverBesoin_repliFlagsLegacy_etapeChef() {
        BesoinFormation b = besoin(23L, "ens-user", BesoinStatus.CUP_APPROVED, null);
        b.setApprouveCUP(true);
        // currentApprovalStep null -> repli : CUP=true => étape CHEF_DEPARTEMENT
        when(besoinFormationRepository.findByIdForUpdate(23L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CHEF_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BesoinFormationResponse response = service.approuverBesoin(23L);
        assertEquals(BesoinStatus.DEPARTMENT_APPROVED, response.getStatus());
    }

    @Test
    void approuverBesoin_besoinCollectifAEtapeCup_doitLever409() {
        BesoinFormation b = besoin(24L, "ens-user", BesoinStatus.SUBMITTED, ApprovalStep.CUP);
        b.setTypeBesoin(TypeBesoin.COLLECTIF);
        when(besoinFormationRepository.findByIdForUpdate(24L)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(CUP_SCOPE);

        // Le créateur ne peut pas approuver : utiliser un username différent
        b.setUsername("autre-ens");
        assertThrows(InvalidWorkflowTransitionException.class, () -> service.approuverBesoin(24L));
    }
}
