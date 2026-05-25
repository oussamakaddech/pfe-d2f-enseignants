package tn.esprit.d2f.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Additional coverage tests for BesoinFormationServiceImpl.
 * Targets uncovered branches in updateDataFields, updateApprovalFields, handleNotifications,
 * and edge cases in approuverBesoin.
 */
@ExtendWith(MockitoExtension.class)
class BesoinFormationServiceImplCoverageTest {

    @Mock
    private BesoinFormationRepository besoinFormationRepository;
    @Mock
    private BesoinFormationEventPublisher eventPublisher;
    @Mock
    private NotificationRepository notificationRepository;

    private final BesoinFormationMapper besoinFormationMapper = new BesoinFormationMapper();

    private BesoinFormationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BesoinFormationServiceImpl(
                besoinFormationRepository,
                eventPublisher,
                notificationRepository,
                besoinFormationMapper
        );
        // Provide an ADMIN security context for service methods that read SecurityContextHolder
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

    // ──────────────────────────────────────────────
    // modifyBesoinFormation — null fields should NOT update existing values
    // ──────────────────────────────────────────────

    @Test
    void modifyBesoinFormation_withAllNullFields_shouldNotOverrideExisting() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        // All other fields remain null

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setTitre("Original Titre");
        existing.setObjectifFormation("Original Obj");
        existing.setTypeBesoin(TypeBesoin.COLLECTIF);
        existing.setPriorite(Priorite.HAUTE);
        existing.setImpactStrategique("Original Impact");
        existing.setPropositionAnimateur("Original Anim");
        existing.setHoraireSouhaite("Original Horaire");
        existing.setUp("Original UP");
        existing.setDepartement("Original DEP");
        existing.setEstOuverte(true);
        existing.setAutresInformations("Original Infos");
        existing.setPeriodCode(PeriodCode.WINTER);
        existing.setCustomPeriodLabel("Original Label");
        existing.setApprouveCUP(true);
        existing.setApprouveChefDep(true);
        existing.setApprouveAdmin(true);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        BesoinFormationResponse result = service.modifyBesoinFormation(request);

        assertNotNull(result);
        // Existing values should be preserved when request fields are null
        assertEquals("Original Titre", existing.getTitre());
        assertEquals("Original Obj", existing.getObjectifFormation());
        assertEquals(TypeBesoin.COLLECTIF, existing.getTypeBesoin());
        assertEquals(Priorite.HAUTE, existing.getPriorite());
        assertEquals("Original Impact", existing.getImpactStrategique());
        assertEquals("Original Anim", existing.getPropositionAnimateur());
        assertEquals("Original Horaire", existing.getHoraireSouhaite());
        assertEquals("Original UP", existing.getUp());
        assertEquals("Original DEP", existing.getDepartement());
        assertTrue(existing.getEstOuverte());
        assertEquals("Original Infos", existing.getAutresInformations());
        assertEquals(PeriodCode.WINTER, existing.getPeriodCode());
        assertEquals("Original Label", existing.getCustomPeriodLabel());
        assertTrue(existing.getApprouveCUP());
        assertTrue(existing.getApprouveChefDep());
        assertTrue(existing.getApprouveAdmin());
    }

    // ──────────────────────────────────────────────
    // handleNotifications — CUP approval TRUE: no refusal notification
    // ──────────────────────────────────────────────

    @Test
    void modifyBesoinFormation_cupApprovedNoRefusalNotification() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setApprouveCUP(true);  // approved, not refused
        request.setApprouveAdmin(false); // not admin approved
        request.setCommentaire("Comment");

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        // Only CUP TRUE => no refusal notification, no admin approval notification
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void modifyBesoinFormation_cupNull_noRefusalNotification() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        // approuveCUP remains null (not set)
        request.setCommentaire("Comment");

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);
        // existing.approuveCUP is null by default

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        // No notifications when CUP is null
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void modifyBesoinFormation_onlyCupRefused_shouldCreateOneNotification() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setApprouveCUP(false); // CUP refused
        // admin NOT approved
        request.setCommentaire("Reason for refusal");

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        // Only CUP refusal notification (not admin approval)
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());
        Notification savedNotif = captor.getValue();
        assertEquals("testuser", savedNotif.getUsername());
        assertTrue(savedNotif.getMessage().contains("refusée"));
        assertEquals("Reason for refusal", savedNotif.getCommentaire());
    }

    @Test
    void modifyBesoinFormation_onlyAdminApproved_shouldCreateOneNotification() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setApprouveAdmin(true); // admin approved
        // CUP not refused (null)
        request.setCommentaire("Approved");

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        // Only admin approval notification
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());
        Notification savedNotif = captor.getValue();
        assertEquals("testuser", savedNotif.getUsername());
        assertTrue(savedNotif.getMessage().contains("acceptée"));
        assertEquals("Approved", savedNotif.getCommentaire());
    }

    @Test
    void modifyBesoinFormation_noNotificationsWhenAdminFalse() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setApprouveCUP(true);   // CUP approved (not refused)
        request.setApprouveAdmin(false); // admin NOT approved (false, not true)

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    // ──────────────────────────────────────────────
    // modifyBesoinFormation — findById throws when not found
    // ──────────────────────────────────────────────

    @Test
    void modifyBesoinFormation_whenNotFound_shouldThrow() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(999L);

        when(besoinFormationRepository.findById(999L)).thenReturn(Optional.empty());

        // Service now throws ResourceNotFoundException (→ HTTP 404) instead of NoSuchElementException
        assertThrows(ResourceNotFoundException.class, () -> service.modifyBesoinFormation(request));
    }

    // ──────────────────────────────────────────────
    // approuverBesoin — when not found
    // ──────────────────────────────────────────────

    @Test
    void approuverBesoin_whenNotFound_shouldThrow() {
        when(besoinFormationRepository.findById(999L)).thenReturn(Optional.empty());

        // Service now throws ResourceNotFoundException (→ HTTP 404) instead of IllegalArgumentException
        // Exception is thrown before SecurityContextHolder is accessed, so no auth setup needed
        assertThrows(ResourceNotFoundException.class, () -> service.approuverBesoin(999L));
    }

    // ──────────────────────────────────────────────
    // approuverBesoin — with null typeBesoin and null periodCode
    // ──────────────────────────────────────────────

    @Test
    void approuverBesoin_withNullTypeBesoinAndPeriodCode_shouldSetNullInEvent() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // Pre-set steps 1 and 2 so the service advances to step 3 (Admin) where publishApprovalEvent is called
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(false);
        besoin.setEventPublished(false);
        besoin.setTypeBesoin(null);   // null typeBesoin → event.typeBesoin = null
        besoin.setPeriodCode(null);   // null periodCode → event.periodCode = null
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findById(id)).thenReturn(Optional.of(besoin));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoin);

        BesoinFormationResponse result = service.approuverBesoin(id);

        assertNotNull(result);
        assertTrue(result.getApprouveAdmin());
        verify(eventPublisher).publish(any());
    }

    // ──────────────────────────────────────────────
    // approuverBesoin — with non-null typeBesoin and periodCode
    // ──────────────────────────────────────────────

    @Test
    void approuverBesoin_withTypeBesoinAndPeriodCode_shouldSetNamesInEvent() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // Pre-set steps 1 and 2 so the service advances to step 3 (Admin) where publishApprovalEvent is called
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(false);
        besoin.setEventPublished(false);
        besoin.setTypeBesoin(TypeBesoin.COLLECTIF);   // non-null → event.typeBesoin = "COLLECTIF"
        besoin.setPeriodCode(PeriodCode.SUMMER);       // non-null → event.periodCode = "SUMMER"
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findById(id)).thenReturn(Optional.of(besoin));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoin);

        BesoinFormationResponse result = service.approuverBesoin(id);

        assertNotNull(result);
        assertTrue(result.getApprouveAdmin());
        verify(eventPublisher).publish(any());
    }

    // ──────────────────────────────────────────────
    // approuverBesoin — eventPublished=null (edge case)
    // ──────────────────────────────────────────────

    @Test
    void approuverBesoin_whenEventPublishedNull_shouldPublishEvent() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // Pre-set steps 1 and 2 so the service advances to step 3 (Admin) where publish is called
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(false);
        besoin.setEventPublished(null);  // null instead of false — Boolean.TRUE.equals(null) == false → publish
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findById(id)).thenReturn(Optional.of(besoin));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoin);

        BesoinFormationResponse result = service.approuverBesoin(id);

        assertNotNull(result);
        assertTrue(result.getApprouveAdmin());
        verify(eventPublisher).publish(any());
    }

    // ──────────────────────────────────────────────
    // retrieveAllBesoinFormations — with empty page
    // ──────────────────────────────────────────────

    @Test
    void retrieveAllBesoinFormations_emptyPage_shouldReturnEmptyPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findAll(pageable)).thenReturn(Page.empty());

        Page<BesoinFormationResponse> result = service.retrieveAllBesoinFormations(pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
    }

    // ──────────────────────────────────────────────
    // retrieveAllBesoinFormations — with multiple elements
    // ──────────────────────────────────────────────

    @Test
    void retrieveAllBesoinFormations_multipleElements_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b1 = new BesoinFormation();
        b1.setIdBesoinFormation(1L);
        b1.setTitre("T1");
        b1.setNbMaxParticipants(10);
        b1.setDureeFormation(5);
        BesoinFormation b2 = new BesoinFormation();
        b2.setIdBesoinFormation(2L);
        b2.setTitre("T2");
        b2.setNbMaxParticipants(20);
        b2.setDureeFormation(10);
        Page<BesoinFormation> page = new PageImpl<>(java.util.List.of(b1, b2));

        when(besoinFormationRepository.findAll(pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveAllBesoinFormations(pageable);

        assertEquals(2, result.getTotalElements());
        assertEquals("T1", result.getContent().get(0).getTitre());
        assertEquals("T2", result.getContent().get(1).getTitre());
    }

    // ──────────────────────────────────────────────
    // modifyBesoinFormation — partial field update
    // ──────────────────────────────────────────────

    @Test
    void modifyBesoinFormation_partialUpdate_shouldOnlyUpdateSpecifiedFields() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setTitre("New Title");
        request.setPriorite(Priorite.CRITIQUE);
        // All other fields null

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setTitre("Old Title");
        existing.setPriorite(Priorite.BASSE);
        existing.setObjectifFormation("Keep me");
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        assertEquals("New Title", existing.getTitre());
        assertEquals(Priorite.CRITIQUE, existing.getPriorite());
        assertEquals("Keep me", existing.getObjectifFormation());
    }

    // ──────────────────────────────────────────────
    // handleNotifications with null commentaire
    // ──────────────────────────────────────────────

    @Test
    void modifyBesoinFormation_cupRefused_withNullCommentaire() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setApprouveCUP(false);
        // commentaire is null

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        service.modifyBesoinFormation(request);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());
        assertNull(captor.getValue().getCommentaire());
    }

    // ──────────────────────────────────────────────
    // retrieveApprovedBesoinFormations — with results
    // ──────────────────────────────────────────────

    @Test
    void retrieveApprovedBesoinFormations_withResults_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(1L);
        b.setApprouveAdmin(true);
        b.setNbMaxParticipants(10);
        b.setDureeFormation(5);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(b));

        when(besoinFormationRepository.findByApprouveAdminTrue(pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveApprovedBesoinFormations(pageable);

        assertEquals(1, result.getTotalElements());
        verify(besoinFormationRepository).findByApprouveAdminTrue(pageable);
    }

    // ──────────────────────────────────────────────
    // retrieveByUp — with results
    // ──────────────────────────────────────────────

    @Test
    void retrieveByUp_withResults_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(1L);
        b.setUp("UP1");
        b.setNbMaxParticipants(10);
        b.setDureeFormation(5);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(b));

        when(besoinFormationRepository.findByUp("UP1", pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveByUp("UP1", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("UP1", result.getContent().get(0).getUp());
    }

    // ──────────────────────────────────────────────
    // retrieveByDepartement — with results
    // ──────────────────────────────────────────────

    @Test
    void retrieveByDepartement_withResults_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(1L);
        b.setDepartement("DEP1");
        b.setNbMaxParticipants(10);
        b.setDureeFormation(5);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(b));

        when(besoinFormationRepository.findByDepartement("DEP1", pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveByDepartement("DEP1", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("DEP1", result.getContent().get(0).getDepartement());
    }

    // ──────────────────────────────────────────────
    // retrieveAllByPriorite — with results
    // ──────────────────────────────────────────────

    @Test
    void retrieveAllByPriorite_withResults_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(1L);
        b.setPriorite(Priorite.HAUTE);
        b.setNbMaxParticipants(10);
        b.setDureeFormation(5);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(b));

        when(besoinFormationRepository.findAllByOrderByPrioriteDesc(pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveAllByPriorite(pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(Priorite.HAUTE, result.getContent().get(0).getPriorite());
    }

    // ──────────────────────────────────────────────
    // retrieveByPriorite — with actual priority value
    // ──────────────────────────────────────────────

    @Test
    void retrieveByPriorite_withResults_shouldMapAll() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(1L);
        b.setPriorite(Priorite.CRITIQUE);
        b.setNbMaxParticipants(10);
        b.setDureeFormation(5);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(b));

        when(besoinFormationRepository.findByPriorite(Priorite.CRITIQUE, pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveByPriorite(Priorite.CRITIQUE, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(Priorite.CRITIQUE, result.getContent().get(0).getPriorite());
    }
}
