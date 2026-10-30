package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.dto.animator.AnimatorProposalResponse;
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
import esprit.pfe.serviceformation.exception.ProposalConflictException;
import esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorProposalRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.services.CurrentUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests de couverture — consultation, retrait, refus manager, affectation
 * manuelle et branches de garde-fous de AnimatorProposalService.
 */
@ExtendWith(MockitoExtension.class)
class AnimatorProposalServiceCoverageTest {

    @Mock private FormationAnimatorProposalRepository proposalRepository;
    @Mock private FormationAnimatorRepository animatorRepository;
    @Mock private FormationRepository formationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private AnimateurExterneRepository animateurExterneRepository;
    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private AnimatorProposalEventPublisher eventPublisher;
    @Mock private AnimatorCalendarService calendarService;
    @Mock private AnimatorScopeService scopeService;

    private AnimatorProposalService service;

    @BeforeEach
    void setUp() {
        service = new AnimatorProposalService(
                proposalRepository, animatorRepository, formationRepository,
                enseignantRepository, animateurExterneRepository, seanceRepository,
                scopeService, eventPublisher, calendarService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String username, String role) {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "none")
                .subject(username).claim("userId", "uuid-" + username)
                .claim("scope", "ROLE_" + role).build();
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        jwt, null, List.of()));
    }

    private Formation formation(Long id, EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation("ML");
        f.setEtatFormation(etat);
        f.setDateDebut(LocalDate.now().plusDays(5));
        f.setDateFin(LocalDate.now().plusDays(15));
        return f;
    }

    private Enseignant enseignant(String id, String userId, String mail) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setUserId(userId);
        e.setMail(mail);
        e.setNom("Nom");
        e.setPrenom("Prenom");
        return e;
    }

    private FormationAnimatorProposal proposal(Long id, ProposalType type, ProposalStatus status,
                                               String proposerId, String proposedBy) {
        return FormationAnimatorProposal.builder()
                .id(id).formationId(1L).proposerId(proposerId)
                .proposerType(ProposerType.TEACHER).proposalType(type)
                .role(AnimatorRole.LEAD_TRAINER).status(status)
                .proposedBy(proposedBy)
                .proposedAt(java.time.LocalDateTime.now())
                .build();
    }

    private AnimatorScopeService.ResolvedAnimatorScope scope(String username, String role, boolean global) {
        return new AnimatorScopeService.ResolvedAnimatorScope(
                new CurrentUser(username, "uuid-" + username, username + "@esprit.tn",
                        new java.util.HashSet<>(List.of(role))),
                "UP_INFO", "DEPT_GL", global);
    }

    // ── Consultation ─────────────────────────────────────────────────────

    @Test
    void listFormationProposals_mappeChaqueProposition() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "chef-user", "uuid-chef-user", "chef@esprit.tn",
                new java.util.HashSet<>(List.of("CHEF_DEPARTEMENT"))));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(proposalRepository.findByFormationIdOrderByProposedAtDesc(1L)).thenReturn(List.of(
                proposal(1L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));
        when(enseignantRepository.findById("E001"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-x", "ens@esprit.tn")));

        List<AnimatorProposalResponse> result = service.listFormationProposals(1L);

        assertEquals(1, result.size());
        assertEquals(ProposalStatus.PENDING_VALIDATION, result.get(0).getStatus());
        assertEquals("ML", result.get(0).getFormationTitre());
        assertNotNull(result.get(0).getProposerNom());
    }

    @Test
    void listMyProposals_resoutLaFicheCourante() {
        authenticate("ens-user", "ENSEIGNANT");
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "ens-user", "uuid-ens-user", "ens@esprit.tn",
                new java.util.HashSet<>(List.of("ENSEIGNANT"))));
        when(enseignantRepository.findByUserId("uuid-ens-user"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-ens-user", "ens@esprit.tn")));
        when(proposalRepository.findByProposerIdAndStatusIn(eq("E001"), anyList()))
                .thenReturn(List.of(proposal(1L, ProposalType.SELF_PROPOSAL,
                        ProposalStatus.APPROVED, "E001", "ens-user")));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation(1L, EtatFormation.PLANIFIE)));

        List<AnimatorProposalResponse> result = service.listMyProposals();

        assertEquals(1, result.size());
        assertEquals(ProposalStatus.APPROVED, result.get(0).getStatus());
    }

    @Test
    void listMyProposals_sansFiche_utiliseLeUsername() {
        authenticate("ens-user", "ENSEIGNANT");
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "ens-user", "uuid-ens-user", "ens@esprit.tn",
                new java.util.HashSet<>(List.of("ENSEIGNANT"))));
        lenient().when(enseignantRepository.findByUserId("uuid-ens-user")).thenReturn(Optional.empty());
        lenient().when(enseignantRepository.findByMailIgnoreCase("ens@esprit.tn")).thenReturn(Optional.empty());
        when(proposalRepository.findByProposerIdAndStatusIn(eq("ens-user"), anyList()))
                .thenReturn(List.of());

        assertTrue(service.listMyProposals().isEmpty());
    }

    @Test
    void listPendingProposals_filtreParPérimètre() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        AnimatorScopeService.ResolvedAnimatorScope chefScope = scope("chef-user", "CHEF_DEPARTEMENT", false);
        when(scopeService.resolveScope()).thenReturn(chefScope);
        Formation inScope = formation(1L, EtatFormation.PLANIFIE);
        when(proposalRepository.findByStatusIn(anyList())).thenReturn(List.of(
                proposal(1L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(inScope));
        when(enseignantRepository.findById("E001"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-x", "ens@esprit.tn")));
        // Dans le périmètre du chef → visible (doNothing implicite sur mock).

        List<AnimatorProposalResponse> result = service.listPendingProposals();
        assertEquals(1, result.size());
    }

    @Test
    void listPendingProposals_horsPérimètre_exclu() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", false));
        when(proposalRepository.findByStatusIn(anyList())).thenReturn(List.of(
                proposal(1L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation(1L, EtatFormation.PLANIFIE)));
        doThrow(new esprit.pfe.serviceformation.exception.AccessDeniedException("hors périmètre"))
                .when(scopeService).ensureCanManageFormation(any(), any());

        assertTrue(service.listPendingProposals().isEmpty());
    }

    // ── Retrait et refus ────────────────────────────────────────────────

    @Test
    void withdraw_parLeCreateur_passeEnCancelled() {
        authenticate("ens-user", "ENSEIGNANT");
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "ens-user", "uuid-ens-user", "ens@esprit.tn",
                new java.util.HashSet<>(List.of("ENSEIGNANT"))));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));
        when(scopeService.requireFormation(1L)).thenReturn(formation(1L, EtatFormation.PLANIFIE));
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimatorProposalResponse response = service.withdrawProposal(10L);

        assertEquals(ProposalStatus.CANCELLED, response.getStatus());
    }

    @Test
    void withdraw_statutTerminal_refuse409() {
        authenticate("ens-user", "ENSEIGNANT");
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "ens-user", "uuid-ens-user", "ens@esprit.tn",
                new java.util.HashSet<>(List.of("ENSEIGNANT"))));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.APPROVED,
                        "E001", "ens-user")));

        ProposalConflictException ex = assertThrows(ProposalConflictException.class,
                () -> service.withdrawProposal(10L));
        assertTrue(ex.getMessage().contains("Transition invalide"));
    }

    @Test
    void managerReject_passeEnRejectedAvecRaison() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", true));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));
        when(scopeService.requireFormation(1L)).thenReturn(formation(1L, EtatFormation.PLANIFIE));
        when(enseignantRepository.findById("E001"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-x", "ens@esprit.tn")));
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimatorProposalResponse response = service.managerRejectProposal(10L, "Motifs insuffisants");

        assertEquals(ProposalStatus.REJECTED, response.getStatus());
        assertEquals("Motifs insuffisants", response.getRejectionReason());
        assertEquals("chef-user", response.getValidatedBy());
    }

    @Test
    void managerReject_statutTerminal_refuse409() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", true));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.REJECTED,
                        "E001", "ens-user")));
        when(scopeService.requireFormation(1L)).thenReturn(formation(1L, EtatFormation.PLANIFIE));
        when(enseignantRepository.findById("E001"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-x", "ens@esprit.tn")));

        assertThrows(ProposalConflictException.class,
                () -> service.managerRejectProposal(10L, "déjà refusée"));
    }

    // ── Affectation manuelle post-approbation ──────────────────────────

    @Test
    void assignAnimator_depuisPropositionApprouvee_creeAffectation() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", true));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.MANAGER_PROPOSAL, ProposalStatus.APPROVED,
                        "E001", "cup-user")));
        when(animatorRepository.findFirstByFormationIdAndTeacherIdAndStatus(
                eq(1L), eq("E001"), eq(AssignmentStatus.ACTIVE))).thenReturn(Optional.empty());
        when(animatorRepository.save(any(FormationAnimator.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var response = service.assignAnimator(1L, 10L);

        assertEquals(AssignmentStatus.ACTIVE, response.getStatus());
        assertEquals("E001", response.getTeacherId());
        verify(calendarService).onAnimatorConfirmed(eq(f), any(FormationAnimator.class), any());
    }

    @Test
    void assignAnimator_propositionPasApprouvee_refuse409() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", true));
        when(scopeService.requireFormation(1L)).thenReturn(formation(1L, EtatFormation.PLANIFIE));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.PENDING_VALIDATION,
                        "E001", "ens-user")));

        assertThrows(ProposalConflictException.class, () -> service.assignAnimator(1L, 10L));
    }

    @Test
    void assignAnimator_formationIncoherente_refuse409() {
        authenticate("chef-user", "CHEF_DEPARTEMENT");
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", true));
        when(scopeService.requireFormation(2L)).thenReturn(formation(2L, EtatFormation.PLANIFIE));
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(
                proposal(10L, ProposalType.SELF_PROPOSAL, ProposalStatus.APPROVED,
                        "E001", "ens-user")));

        // La proposition appartient à la formation 1, pas à la 2.
        assertThrows(ProposalConflictException.class, () -> service.assignAnimator(2L, 10L));
    }

    @Test
    void listFormationAnimators_mappeLesAffectations() {
        when(scopeService.requireFormation(1L)).thenReturn(formation(1L, EtatFormation.PLANIFIE));
        when(animatorRepository.findByFormationId(1L)).thenReturn(List.of(FormationAnimator.builder()
                .id(7L).formationId(1L).teacherId("E001")
                .role(AnimatorRole.LEAD_TRAINER).assignedBy("chef-user")
                .assignedAt(java.time.LocalDateTime.now())
                .status(AssignmentStatus.ACTIVE).build()));
        when(enseignantRepository.findById("E001"))
                .thenReturn(Optional.of(enseignant("E001", "uuid-x", "ens@esprit.tn")));

        var result = service.listFormationAnimators(1L);

        assertEquals(1, result.size());
        assertEquals("E001", result.get(0).getTeacherId());
        assertEquals(AnimatorRole.LEAD_TRAINER, result.get(0).getRole());
    }
}
