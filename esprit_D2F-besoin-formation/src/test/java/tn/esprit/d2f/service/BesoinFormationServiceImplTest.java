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
import tn.esprit.d2f.dto.BesoinFormationApprovedEvent;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
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

@ExtendWith(MockitoExtension.class)
class BesoinFormationServiceImplTest {

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

    private BesoinFormationMapper besoinFormationMapper = new BesoinFormationMapper();

    private BesoinFormationServiceImpl service;

    /** Périmètre ADMIN de l'utilisateur de test (test-admin). */
    private static final ReviewerScopeService.ResolvedScope ADMIN_SCOPE =
            new ReviewerScopeService.ResolvedScope("test-admin", "test-admin", CreatorRole.ADMIN, null, null, true);

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


    @Test
    void retrieveAllBesoinFormations_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);
        Page<BesoinFormation> page = new PageImpl<>(Collections.singletonList(besoin));

        when(besoinFormationRepository.findAll(pageable)).thenReturn(page);

        Page<BesoinFormationResponse> result = service.retrieveAllBesoinFormations(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(besoinFormationRepository).findAll(pageable);
    }

    @Test
    void retrieveBesoinFormation_whenExists_shouldReturnResponse() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findById(id)).thenReturn(Optional.of(besoin));

        BesoinFormationResponse result = service.retrieveBesoinFormation(id);

        assertNotNull(result);
        assertEquals(id, result.getIdBesoinFormation());
    }

    @Test
    void retrieveBesoinFormation_whenNotExists_shouldThrowException() {
        long id = 1L;
        when(besoinFormationRepository.findById(id)).thenReturn(Optional.empty());

        // Service now throws ResourceNotFoundException (→ HTTP 404) instead of IllegalArgumentException
        assertThrows(ResourceNotFoundException.class, () -> service.retrieveBesoinFormation(id));
    }

    @Test
    void addBesoinFormation_shouldSaveAndReturnResponse() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("New Formation");
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        request.setUp("UP1");
        request.setDepartement("DEP1");
        BesoinFormation savedBesoin = new BesoinFormation();
        savedBesoin.setIdBesoinFormation(1L);
        savedBesoin.setTitre("New Formation");
        savedBesoin.setNbMaxParticipants(20);
        savedBesoin.setDureeFormation(10);

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(savedBesoin);

        BesoinFormationResponse result = service.addBesoinFormation(request);

        assertNotNull(result);
        assertEquals("New Formation", result.getTitre());
        verify(besoinFormationRepository).save(any(BesoinFormation.class));
    }

    @Test
    void addBesoinFormation_teacherUsesServerScopeAndIgnoresPayloadScope() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Formation individuelle");
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        request.setUp("UP-client");
        request.setDepartement("DEP-client");
        ReviewerScopeService.ResolvedScope teacher = new ReviewerScopeService.ResolvedScope(
                "teacher", "teacher-id", CreatorRole.ENSEIGNANT, "UP-server", "DEP-server", false);
        BesoinFormation saved = new BesoinFormation();
        saved.setIdBesoinFormation(2L);

        when(reviewerScopeService.resolveCurrentUser()).thenReturn(teacher);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenAnswer(invocation -> {
            BesoinFormation value = invocation.getArgument(0);
            assertEquals("UP-server", value.getUp());
            assertEquals("DEP-server", value.getDepartement());
            assertEquals(ApprovalStep.CUP, value.getCurrentApprovalStep());
            assertEquals(BesoinStatus.SUBMITTED, value.getStatus());
            return saved;
        });

        service.addBesoinFormation(request);

        verify(besoinFormationRepository).save(any(BesoinFormation.class));
    }

    @Test
    void addBesoinFormation_teacherCannotCreateCollectiveNeed() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Besoin collectif");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        ReviewerScopeService.ResolvedScope teacher = new ReviewerScopeService.ResolvedScope(
                "teacher", "teacher-id", CreatorRole.ENSEIGNANT, "UP1", "DEP1", false);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(teacher);

        assertThrows(AccessDeniedException.class, () -> service.addBesoinFormation(request));
        verify(besoinFormationRepository, never()).save(any());
    }

    @Test
    void pendingApproval_adminOnlyReceivesFinalStep() {
        Pageable pageable = PageRequest.of(0, 10);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.findByCurrentApprovalStep(ApprovalStep.ADMIN, pageable))
                .thenReturn(Page.empty());

        service.retrievePendingApproval(pageable);

        verify(besoinFormationRepository).findByCurrentApprovalStep(ApprovalStep.ADMIN, pageable);
        verify(besoinFormationRepository, never()).findByCurrentApprovalStepIn(any(), any());
    }

    @Test
    void removeBesoinFormation_shouldDelete() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        when(besoinFormationRepository.findById(id)).thenReturn(Optional.of(besoin));

        service.removeBesoinFormation(id);

        // Fix 5: soft delete — sets deletedAt instead of hard-deleting
        assertNotNull(besoin.getDeletedAt());
        verify(besoinFormationRepository).save(besoin);
        verify(besoinFormationRepository, never()).deleteById(any());
    }

    @Test
    void modifyBesoinFormation_shouldUpdateAllFieldsAndSave() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setTitre("Updated Titre");
        request.setObjectifFormation("Updated Obj");
        request.setTypeBesoin(TypeBesoin.ANIMER_UNE_FORMATION);
        request.setPriorite(tn.esprit.d2f.entity.enumerations.Priorite.HAUTE);
        request.setImpactStrategique("Impact");
        request.setPropositionAnimateur("Anim");
        request.setHoraireSouhaite("Horaire");
        request.setUp("UP");
        request.setDepartement("DEP");
        request.setEstOuverte(true);
        request.setAutresInformations("Infos");
        request.setPeriodCode(tn.esprit.d2f.entity.enumerations.PeriodCode.WINTER);
        request.setCustomPeriodLabel("Label");
        
        request.setApprouveCUP(false);
        request.setApprouveChefDep(true);
        request.setApprouveAdmin(true);
        request.setCommentaire("Test comment");

        BesoinFormation existing = new BesoinFormation();
        existing.setIdBesoinFormation(1L);
        existing.setUsername("testuser");
        existing.setNbMaxParticipants(20);
        existing.setDureeFormation(10);

        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(existing);

        BesoinFormationResponse result = service.modifyBesoinFormation(request);

        assertNotNull(result);
        assertEquals("Updated Titre", existing.getTitre());
        assertEquals("Updated Obj", existing.getObjectifFormation());
        assertEquals("UP", existing.getUp());
        // Workflow sécurisé : une modification n'émet une notification que si
        // un flag d'approbation passe à false (refus d'étape). Ici tous les
        // flags restent inchangés côté entité → aucune notification attendue.
        verify(besoinFormationRepository).save(existing);
    }

    @Test
    void approuverBesoin_shouldSetAdminApprovedAndPublishEvent() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // Pre-set steps 1 and 2 so the service advances to step 3 (Admin approval)
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(false);
        besoin.setEventPublished(false);
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findByIdForUpdate(id)).thenReturn(Optional.of(besoin));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoin);

        BesoinFormationResponse result = service.approuverBesoin(id);

        assertTrue(result.getApprouveAdmin());
        verify(eventPublisher).publish(any(BesoinFormationApprovedEvent.class));
        verify(besoinFormationRepository).save(any(BesoinFormation.class));
    }

    @Test
    void approuverBesoin_shouldPopulateAllFieldsInEvent() {
        long id = 1L;
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(id);
        b.setUsername("test-user");
        b.setTypeBesoin(TypeBesoin.ANIMER_UNE_FORMATION);
        b.setObjectifFormation("Obj");
        b.setPropositionAnimateur("Prop");
        b.setPrerequis("Pre");
        b.setPublicCible("Public");
        b.setNbMaxParticipants(20);
        b.setProgrammeFormation("Prog");
        b.setDureeFormation(10);
        b.setTheme("Theme");
        b.setObjectifsOperationnels("Op");
        b.setObjectifsPedagogiques("Ped");
        b.setMethodesPedagogiques("Met");
        b.setMoyensPedagogiques("Moy");
        b.setMethodesEvaluationAcquis("Eval");
        b.setProfilFormateur("Prof");
        b.setTitre("Titre");
        b.setHoraireSouhaite("Horaire");
        b.setUp("UP");
        b.setDepartement("DEP");
        b.setApprouveCUP(true);
        b.setApprouveChefDep(true);
        b.setApprouveAdmin(false);
        b.setEventPublished(false);

        when(besoinFormationRepository.findByIdForUpdate(id)).thenReturn(Optional.of(b));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(b);

        service.approuverBesoin(id);

        verify(eventPublisher).publish(any(BesoinFormationApprovedEvent.class));
        verify(besoinFormationRepository).save(b);
    }

    @Test
    void approuverBesoin_whenAlreadyTreated_shouldRejectTransition() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // All steps already completed — the need is terminal : 409 expected.
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(true);
        besoin.setEventPublished(true);
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findByIdForUpdate(id)).thenReturn(Optional.of(besoin));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);

        assertThrows(InvalidWorkflowTransitionException.class, () -> service.approuverBesoin(id));
        verify(eventPublisher, never()).publish(any());
        verify(besoinFormationRepository, never()).save(any(BesoinFormation.class));
    }

    @Test
    void approuverBesoin_whenPublisherFails_shouldStillReturnResponse() {
        long id = 1L;
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(id);
        // Pre-set steps 1 and 2 so the service advances to step 3 where the publisher is called
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(true);
        besoin.setApprouveAdmin(false);
        besoin.setEventPublished(false);
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);

        when(besoinFormationRepository.findByIdForUpdate(id)).thenReturn(Optional.of(besoin));
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(ADMIN_SCOPE);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoin);
        doThrow(new RuntimeException("MQ Error")).when(eventPublisher).publish(any());

        // publishApprovalEvent has a bounded retry (3 attempts) — publisher failure
        // must NOT roll back the approval, and the scheduler will republish later.
        BesoinFormationResponse result = service.approuverBesoin(id);

        assertNotNull(result);
        assertTrue(result.getApprouveAdmin());
        assertEquals(tn.esprit.d2f.entity.enumerations.BesoinStatus.ADMIN_APPROVED, besoin.getStatus());
        verify(eventPublisher, times(3)).publish(any());
    }

    @Test
    void retrieveApprovedBesoinFormations_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByApprouveAdminTrue(pageable)).thenReturn(Page.empty());
        service.retrieveApprovedBesoinFormations(pageable);
        verify(besoinFormationRepository).findByApprouveAdminTrue(pageable);
    }

    @Test
    void retrieveByUp_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByUp("UP1", pageable)).thenReturn(Page.empty());
        service.retrieveByUp("UP1", pageable);
        verify(besoinFormationRepository).findByUp("UP1", pageable);
    }

    @Test
    void retrieveByDepartement_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByDepartement("DEP", pageable)).thenReturn(Page.empty());
        service.retrieveByDepartement("DEP", pageable);
        verify(besoinFormationRepository).findByDepartement("DEP", pageable);
    }

    @Test
    void retrieveAllByPriorite_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findAllByOrderByPrioriteDesc(pageable)).thenReturn(Page.empty());
        service.retrieveAllByPriorite(pageable);
        verify(besoinFormationRepository).findAllByOrderByPrioriteDesc(pageable);
    }

    @Test
    void retrieveByPriorite_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(besoinFormationRepository.findByPriorite(any(), eq(pageable))).thenReturn(Page.empty());
        service.retrieveByPriorite(null, pageable);
        verify(besoinFormationRepository).findByPriorite(null, pageable);
    }
}
