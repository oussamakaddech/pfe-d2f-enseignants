package tn.esprit.d2f.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.BesoinFormationEventPublisher;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinApprovalHistoryRepository;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;
import tn.esprit.d2f.repository.BesoinFormationRepository;
import tn.esprit.d2f.repository.NotificationRepository;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Périmètre de lecture par rôle (CUP → son UP, chef → son département) et
 * caractère best-effort de la notification e-mail D2F.
 */
@ExtendWith(MockitoExtension.class)
class BesoinFormationScopeAndNotifyTest {

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
    @Mock
    private BesoinFormationMailNotifier mailNotifier;

    private BesoinFormationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BesoinFormationServiceImpl(
                besoinFormationRepository,
                eventPublisher,
                notificationRepository,
                new BesoinFormationMapper(),
                reviewerScopeService,
                historyRepository,
                besoinCompetenceRepository,
                mailNotifier
        );
    }

    @Test
    @DisplayName("CUP non global : la liste est restreinte a son UP")
    void listeCupRestreinteAUp() {
        Pageable pageable = PageRequest.of(0, 10);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(new ReviewerScopeService.ResolvedScope(
                "cup", "cup-id", CreatorRole.CUP, "UP_INFO", "DEPT_GL", false));
        when(besoinFormationRepository.findByUpAndStatusNotIn(
                eq("UP_INFO"), any(), eq(pageable))).thenReturn(Page.empty(pageable));

        service.retrieveAllBesoinFormations(pageable);

        verify(besoinFormationRepository).findByUpAndStatusNotIn(eq("UP_INFO"), any(), eq(pageable));
        verify(besoinFormationRepository, never()).findByStatusNotIn(any(), any());
    }

    @Test
    @DisplayName("Chef de departement non global : la liste est restreinte a son departement")
    void listeChefRestreinteAuDepartement() {
        Pageable pageable = PageRequest.of(0, 10);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(new ReviewerScopeService.ResolvedScope(
                "chef", "chef-id", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false));
        when(besoinFormationRepository.findByDepartementAndStatusNotIn(
                eq("DEPT_GL"), any(), eq(pageable))).thenReturn(Page.empty(pageable));

        service.retrieveAllBesoinFormations(pageable);

        verify(besoinFormationRepository).findByDepartementAndStatusNotIn(eq("DEPT_GL"), any(), eq(pageable));
        verify(besoinFormationRepository, never()).findByStatusNotIn(any(), any());
    }

    @Test
    @DisplayName("Role global : vue complete, aucun filtre de perimetre")
    void listeGlobaleNonFiltree() {
        Pageable pageable = PageRequest.of(0, 10);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(new ReviewerScopeService.ResolvedScope(
                "admin", "admin-id", CreatorRole.ADMIN, null, null, true));
        when(besoinFormationRepository.findByStatusNotIn(any(), eq(pageable))).thenReturn(Page.empty(pageable));

        service.retrieveAllBesoinFormations(pageable);

        verify(besoinFormationRepository).findByStatusNotIn(any(Collection.class), eq(pageable));
        verify(besoinFormationRepository, never()).findByUpAndStatusNotIn(anyString(), any(), any());
    }

    @Test
    @DisplayName("Notification e-mail en echec : la creation du besoin aboutit quand meme")
    void notificationEnEchecNeBloquePasLaCreation() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Besoin CUP");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        when(reviewerScopeService.resolveCurrentUser()).thenReturn(new ReviewerScopeService.ResolvedScope(
                "cup", "cup-id", CreatorRole.CUP, "UP_INFO", "DEPT_GL", false));
        BesoinFormation saved = new BesoinFormation();
        saved.setIdBesoinFormation(9L);
        saved.setStatus(BesoinStatus.SUBMITTED);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(saved);
        doThrow(new IllegalStateException("executor sature"))
                .when(mailNotifier).notifyD2FBesoinChanged(any(), anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> service.addBesoinFormation(request));

        verify(besoinFormationRepository).save(any(BesoinFormation.class));
        verify(mailNotifier).notifyD2FBesoinChanged(any(), eq("CUP"), eq("ajouté"), anyString());
    }
}
