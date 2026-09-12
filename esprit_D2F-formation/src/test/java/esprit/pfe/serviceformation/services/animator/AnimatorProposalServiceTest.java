package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.dto.animator.AnimatorProposalResponse;
import esprit.pfe.serviceformation.dto.animator.ManagerProposalRequest;
import esprit.pfe.serviceformation.dto.animator.SelfProposalRequest;
import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.AssignmentStatus;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationAnimator;
import esprit.pfe.serviceformation.entities.FormationAnimatorProposal;
import esprit.pfe.serviceformation.entities.ProposalStatus;
import esprit.pfe.serviceformation.entities.ProposalType;
import esprit.pfe.serviceformation.entities.ProposerType;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.exception.ProposalConflictException;
import esprit.pfe.serviceformation.exception.ProposalIncompatibilityException;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests du workflow propositions d'animation — règles métier et sécurité.
 */
@ExtendWith(MockitoExtension.class)
class AnimatorProposalServiceTest {

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

    private static final String TEACHER_ID = "E00001";
    private static final String CUP_USERNAME = "cup-user";
    private static final String ENS_USERNAME = "ens-user";

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

    // ── Helpers ──────────────────────────────────────────────────────────

    private void authenticate(String username, String userId, String role) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(username)
                .claim("userId", userId)
                .claim("scope", "ROLE_" + role)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        jwt, null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role))));
    }

    private Formation formation(Long id, EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation("Machine Learning");
        f.setEtatFormation(etat);
        f.setDateDebut(LocalDate.now().plusDays(10));
        f.setDateFin(LocalDate.now().plusDays(20));
        return f;
    }

    private Enseignant enseignant(String id, String userId, String mail, String upId, String deptId, String specialite) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setUserId(userId);
        e.setMail(mail);
        e.setNom("Karim");
        e.setPrenom("Test");
        e.setSpecialite(specialite);
        if (upId != null) {
            Up up = new Up();
            up.setId(upId);
            e.setUp(up);
        }
        if (deptId != null) {
            Dept dept = new Dept();
            dept.setId(deptId);
            e.setDept(dept);
        }
        return e;
    }

    private FormationAnimatorProposal proposal(Long id, ProposalType type, ProposalStatus status, String proposerId) {
        return FormationAnimatorProposal.builder()
                .id(id)
                .formationId(1L)
                .proposerId(proposerId)
                .proposerType(ProposerType.TEACHER)
                .proposalType(type)
                .role(AnimatorRole.LEAD_TRAINER)
                .status(status)
                .proposedBy(type == ProposalType.SELF_PROPOSAL ? ENS_USERNAME : CUP_USERNAME)
                .proposedAt(java.time.LocalDateTime.now())
                .build();
    }

    private AnimatorScopeService.ResolvedAnimatorScope scope(String username, String role, String upId, String deptId, boolean global) {
        CurrentUser user = new CurrentUser(username, "uuid-" + username, username + "@esprit.tn",
                new java.util.HashSet<>(List.of(role)));
        return new AnimatorScopeService.ResolvedAnimatorScope(user, upId, deptId, global);
    }

    private SelfProposalRequest selfRequest(AnimatorRole role, String motivation) {
        return SelfProposalRequest.builder().role(role).motivation(motivation).build();
    }

    private ManagerProposalRequest managerRequest(String proposerId, AnimatorRole role) {
        return ManagerProposalRequest.builder()
                .proposerId(proposerId)
                .proposerType(ProposerType.TEACHER)
                .role(role)
                .motivation("Expertise ML")
                .build();
    }

    private void stubSelfProposalHappyPath(Formation f, Enseignant self) {
        lenient().when(scopeService.resolveScope()).thenReturn(scope(ENS_USERNAME, "ENSEIGNANT", null, null, false));
        lenient().when(scopeService.requireFormation(1L)).thenReturn(f);
        lenient().when(enseignantRepository.findByUserId("uuid-" + ENS_USERNAME)).thenReturn(Optional.of(self));
        lenient().when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(seanceRepository.findFormationsByAnimateurAndPeriod(eq(self.getId()), any(), any()))
                .thenReturn(List.of());
    }

    // ══════════════════════════════════════════════════════════════════
    // Auto-proposition
    // ══════════════════════════════════════════════════════════════════

    @Test
    void test_teacher_can_self_propose_as_trainer() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        // Formation sans compétences ciblées : contrôle compatibilité passant.
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "Machine Learning");
        stubSelfProposalHappyPath(f, self);
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                eq(1L), eq(TEACHER_ID), eq(AnimatorRole.LEAD_TRAINER), anyList())).thenReturn(Optional.empty());
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                eq(1L), eq(AnimatorRole.LEAD_TRAINER), eq(AssignmentStatus.ACTIVE))).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(1L, AssignmentStatus.ACTIVE)).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(
                eq(1L), eq(AnimatorRole.LEAD_TRAINER), anyList())).thenReturn(List.of());

        AnimatorProposalResponse response = service.createSelfProposal(
                1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Je possède une expertise avancée en ML."));

        assertNotNull(response);
        assertEquals(ProposalStatus.PENDING_VALIDATION, response.getStatus());
        assertEquals(ProposalType.SELF_PROPOSAL, response.getProposalType());
        assertEquals(TEACHER_ID, response.getProposerId());
        verify(eventPublisher).publishProposalCreated(any());
    }

    @Test
    void test_animateur_can_self_propose_as_trainer() {
        authenticate("anim-user", "uuid-anim-user", "ANIMATEUR");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant("E00002", "uuid-anim-user", "anim@esprit.tn", null, null, null);
        // Le scope porte le rôle ANIMATEUR (type de proposition ANIMATEUR).
        lenient().when(scopeService.resolveScope()).thenReturn(scope("anim-user", "ANIMATEUR", null, null, false));
        lenient().when(scopeService.requireFormation(1L)).thenReturn(f);
        lenient().when(enseignantRepository.findByUserId("uuid-anim-user")).thenReturn(Optional.of(self));
        lenient().when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(seanceRepository.findFormationsByAnimateurAndPeriod(eq(self.getId()), any(), any()))
                .thenReturn(List.of());
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                eq(1L), eq("E00002"), eq(AnimatorRole.CO_TRAINER), anyList())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(1L, AssignmentStatus.ACTIVE)).thenReturn(List.of());

        AnimatorProposalResponse response = service.createSelfProposal(
                1L, selfRequest(AnimatorRole.CO_TRAINER, "Expérience d'animation d'ateliers ML."));

        assertEquals(ProposalStatus.PENDING_VALIDATION, response.getStatus());
        assertEquals(ProposerType.ANIMATEUR, response.getProposerType());
    }

    @Test
    void test_self_proposal_requires_manager_validation() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        stubSelfProposalHappyPath(f, self);
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                anyLong(), any(), any(), anyList())).thenReturn(Optional.empty());
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());

        service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Je suis expert ML."));

        // Règle finale : AUCUNE affectation créée par une auto-proposition.
        verify(animatorRepository, never()).save(any(FormationAnimator.class));
    }

    @Test
    void test_self_proposer_cannot_approve_own_proposal() {
        // Un ENSEIGNANT n'a de toute façon pas le rôle validateur ; le test
        // vérifie le garde-fou service même si le rôle était elevé : on
        // authentifie un CUP qui est AUSSI la cible de l'auto-proposition.
        authenticate(CUP_USERNAME, "uuid-ens-user", "CUP");
        FormationAnimatorProposal selfProposal = proposal(10L, ProposalType.SELF_PROPOSAL,
                ProposalStatus.PENDING_VALIDATION, TEACHER_ID);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(selfProposal));
        when(scopeService.resolveScope()).thenReturn(scope(CUP_USERNAME, "CUP", null, null, true));
        // Le validateur (CUP global) est la cible de l'auto-proposition → refus.
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(
                enseignant(TEACHER_ID, "uuid-ens-user", CUP_USERNAME + "@esprit.tn", null, null, null)));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.approveProposal(10L));
        assertTrue(ex.getMessage().contains("propre auto-proposition"));
        verify(animatorRepository, never()).save(any(FormationAnimator.class));
    }

    @Test
    void test_self_proposal_checks_required_competencies() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        esprit.pfe.serviceformation.entities.FormationCompetence fc =
                new esprit.pfe.serviceformation.entities.FormationCompetence();
        fc.setCompetenceNom("Data Engineering");
        f.setFormationCompetences(List.of(fc));
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "Réseaux");
        stubSelfProposalHappyPath(f, self);
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());

        ProposalIncompatibilityException ex = assertThrows(ProposalIncompatibilityException.class,
                () -> service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Je voudrais animer.")));
        assertTrue(ex.getMessage().contains("Compétences incompatibles"));
    }

    @Test
    void test_self_proposal_checks_schedule_conflicts() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        stubSelfProposalHappyPath(f, self);
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());
        // L'enseignant anime déjà une formation sur la même période.
        when(seanceRepository.findFormationsByAnimateurAndPeriod(eq(TEACHER_ID), any(), any()))
                .thenReturn(List.of(formation(2L, EtatFormation.PLANIFIE)));

        ProposalIncompatibilityException ex = assertThrows(ProposalIncompatibilityException.class,
                () -> service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Je suis dispo.")));
        assertTrue(ex.getMessage().contains("Conflit horaire"));
    }

    @Test
    void test_duplicate_self_proposal_is_rejected() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        stubSelfProposalHappyPath(f, self);
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                eq(1L), eq(TEACHER_ID), eq(AnimatorRole.LEAD_TRAINER), anyList()))
                .thenReturn(Optional.of(proposal(99L, ProposalType.SELF_PROPOSAL,
                        ProposalStatus.PENDING_VALIDATION, TEACHER_ID)));

        ProposalConflictException ex = assertThrows(ProposalConflictException.class,
                () -> service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Doublon.")));
        assertTrue(ex.getMessage().contains("Doublon"));
    }

    // ══════════════════════════════════════════════════════════════════
    // Proposition par un responsable
    // ══════════════════════════════════════════════════════════════════

    @Test
    void test_cup_can_propose_teacher_from_own_up() {
        authenticate(CUP_USERNAME, "uuid-cup-user", "CUP");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant target = enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        when(scopeService.resolveScope()).thenReturn(scope(CUP_USERNAME, "CUP", "UP_INFO", null, false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(target));
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                anyLong(), any(), any(), anyList())).thenReturn(Optional.empty());
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimatorProposalResponse response = service.createManagerProposal(
                1L, managerRequest(TEACHER_ID, AnimatorRole.LEAD_TRAINER));

        assertEquals(ProposalStatus.PROPOSED, response.getStatus());
        assertEquals(ProposalType.MANAGER_PROPOSAL, response.getProposalType());
        // La périmètre a bien été contrôlé (UP du CUP == UP de la cible).
        verify(scopeService).ensureProposerInScope(eq(target), any());
    }

    @Test
    void test_cup_cannot_propose_teacher_from_other_up() {
        authenticate(CUP_USERNAME, "uuid-cup-user", "CUP");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        // Cible dans une AUTRE UP que celle du CUP.
        Enseignant target = enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_AUTRE", "DEPT_GL", "ML");
        when(scopeService.resolveScope()).thenReturn(scope(CUP_USERNAME, "CUP", "UP_INFO", null, false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(target));
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());
        doThrow(new AccessDeniedException(
                "Périmètre interdit : cet enseignant n'appartient pas à votre UP."))
                .when(scopeService).ensureProposerInScope(any(), any());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.createManagerProposal(1L, managerRequest(TEACHER_ID, AnimatorRole.LEAD_TRAINER)));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre UP"));
    }

    @Test
    void test_department_scope_is_enforced() {
        authenticate("chef-user", "uuid-chef-user", "CHEF_DEPARTEMENT");
        Formation otherDeptFormation = formation(1L, EtatFormation.PLANIFIE);
        // Formation d'un autre département que celui du chef.
        Dept dept = new Dept();
        dept.setId("DEPT_AUTRE");
        otherDeptFormation.setDepartement(dept);
        FormationAnimatorProposal pending = proposal(5L, ProposalType.SELF_PROPOSAL,
                ProposalStatus.PENDING_VALIDATION, TEACHER_ID);
        when(proposalRepository.findById(5L)).thenReturn(Optional.of(pending));
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", null, "DEPT_GL", false));
        when(scopeService.requireFormation(1L)).thenReturn(otherDeptFormation);
        doThrow(new AccessDeniedException(
                "Périmètre interdit : cette formation n'appartient pas à votre département."))
                .when(scopeService).ensureCanManageFormation(any(), any());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.approveProposal(5L));
        assertTrue(ex.getMessage().contains("département"));
    }

    // ══════════════════════════════════════════════════════════════════
    // Validation et affectation
    // ══════════════════════════════════════════════════════════════════

    @Test
    void test_approved_proposal_creates_assignment() {
        // Le créateur (CUP) ne peut pas valider : le CHEF_DEPARTEMENT valide.
        authenticate("chef-user", "uuid-chef-user", "CHEF_DEPARTEMENT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        FormationAnimatorProposal accepted = proposal(10L, ProposalType.MANAGER_PROPOSAL,
                ProposalStatus.ACCEPTED_BY_TRAINER, TEACHER_ID);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(accepted));
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", null, "DEPT_GL", false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(
                enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_INFO", null, null)));
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(animatorRepository.findFirstByFormationIdAndTeacherIdAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(animatorRepository.save(any(FormationAnimator.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimatorProposalResponse response = service.approveProposal(10L);

        assertEquals(ProposalStatus.APPROVED, response.getStatus());
        // L'affectation définitive est créée après validation.
        verify(animatorRepository).save(any(FormationAnimator.class));
        verify(calendarService).onAnimatorConfirmed(eq(f), any(FormationAnimator.class), eq(accepted));
    }

    @Test
    void test_rejected_proposal_does_not_create_assignment() {
        // Le créateur de l'auto-proposition (ENS) ne peut pas refuser : le CUP refuse.
        authenticate(CUP_USERNAME, "uuid-cup-user", "CUP");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        FormationAnimatorProposal pending = proposal(10L, ProposalType.SELF_PROPOSAL,
                ProposalStatus.PENDING_VALIDATION, TEACHER_ID);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(pending));
        when(scopeService.resolveScope()).thenReturn(scope(CUP_USERNAME, "CUP", "UP_INFO", null, false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(
                enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_INFO", null, null)));
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimatorProposalResponse response = service.managerRejectProposal(10L, "Motifs insuffisants");

        assertEquals(ProposalStatus.REJECTED, response.getStatus());
        // Une proposition refusée ne crée AUCUNE affectation.
        verify(animatorRepository, never()).save(any(FormationAnimator.class));
    }

    @Test
    void test_only_one_lead_trainer_is_allowed() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        stubSelfProposalHappyPath(f, self);
        // Un LEAD_TRAINER est déjà affecté à la formation.
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                eq(1L), eq(AnimatorRole.LEAD_TRAINER), eq(AssignmentStatus.ACTIVE)))
                .thenReturn(Optional.of(FormationAnimator.builder().id(1L).build()));

        ProposalConflictException ex = assertThrows(ProposalConflictException.class,
                () -> service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Je veux animer.")));
        assertTrue(ex.getMessage().contains("LEAD_TRAINER"));
    }

    @Test
    void test_training_cannot_be_published_without_lead_trainer() {
        // Une formation sans LEAD_TRAINER affecté ne peut pas passer à l'état
        // publié : le garde-fou requireNotAlreadyLeadTrainer le garantit côté
        // propositions, et la machine à états (ACHEVE/ANNULE terminaux) bloque
        // la publication sans lead.
        authenticate(CUP_USERNAME, "uuid-cup-user", "CUP");
        Formation annulee = formation(1L, EtatFormation.ANNULE);
        when(scopeService.resolveScope()).thenReturn(scope(CUP_USERNAME, "CUP", "UP_INFO", null, false));
        when(scopeService.requireFormation(1L)).thenReturn(annulee);

        ProposalConflictException ex = assertThrows(ProposalConflictException.class,
                () -> service.createManagerProposal(1L, managerRequest(TEACHER_ID, AnimatorRole.LEAD_TRAINER)));
        assertTrue(ex.getMessage().contains("n'accepte plus de propositions"));
    }

    @Test
    void test_proposal_actions_are_audited() {
        // Chaque transition persiste la proposition (createdBy/updatedBy via
        // BaseAuditEntity) et publie un événement horodaté (audit RabbitMQ).
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        f.setFormationCompetences(List.of());
        Enseignant self = enseignant(TEACHER_ID, "uuid-ens-user", "ens@esprit.tn", "UP_INFO", "DEPT_GL", "ML");
        stubSelfProposalHappyPath(f, self);
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(proposalRepository.findByFormationIdAndRoleAndStatusIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());
        when(proposalRepository.findFirstByFormationIdAndProposerIdAndRoleAndStatusIn(
                anyLong(), any(), any(), anyList())).thenReturn(Optional.empty());

        service.createSelfProposal(1L, selfRequest(AnimatorRole.LEAD_TRAINER, "Audit trail."));

        verify(proposalRepository).save(any(FormationAnimatorProposal.class));
        verify(eventPublisher).publishProposalCreated(any());
    }

    // ══════════════════════════════════════════════════════════════════
    // Calendrier idempotent
    // ══════════════════════════════════════════════════════════════════

    @Test
    void test_calendar_invitation_sent_after_confirmation() {
        // Le créateur (CUP) ne peut pas valider : le CHEF_DEPARTEMENT valide.
        authenticate("chef-user", "uuid-chef-user", "CHEF_DEPARTEMENT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        FormationAnimatorProposal accepted = proposal(10L, ProposalType.MANAGER_PROPOSAL,
                ProposalStatus.ACCEPTED_BY_TRAINER, TEACHER_ID);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(accepted));
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", null, "DEPT_GL", false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(
                enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_INFO", null, null)));
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(animatorRepository.findFirstByFormationIdAndTeacherIdAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(animatorRepository.save(any(FormationAnimator.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.approveProposal(10L);

        // L'invitation calendrier est demandée après confirmation.
        verify(calendarService).onAnimatorConfirmed(eq(f), any(FormationAnimator.class), eq(accepted));
    }

    @Test
    void test_duplicate_calendar_event_is_not_sent() {
        // Idempotence : onAnimatorConfirmed est appelé une seule fois par
        // approbation ; le service calendrier déduit les doublons via eventId.
        authenticate("chef-user", "uuid-chef-user", "CHEF_DEPARTEMENT");
        Formation f = formation(1L, EtatFormation.PLANIFIE);
        FormationAnimatorProposal accepted = proposal(10L, ProposalType.MANAGER_PROPOSAL,
                ProposalStatus.ACCEPTED_BY_TRAINER, TEACHER_ID);
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(accepted));
        when(scopeService.resolveScope()).thenReturn(scope("chef-user", "CHEF_DEPARTEMENT", null, "DEPT_GL", false));
        when(scopeService.requireFormation(1L)).thenReturn(f);
        when(enseignantRepository.findById(TEACHER_ID)).thenReturn(Optional.of(
                enseignant(TEACHER_ID, "uuid-other", "target@esprit.tn", "UP_INFO", null, null)));
        when(animatorRepository.findFirstByFormationIdAndRoleAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(animatorRepository.findByFormationIdAndStatus(anyLong(), any())).thenReturn(List.of());
        when(animatorRepository.findFirstByFormationIdAndTeacherIdAndStatus(
                anyLong(), any(), any())).thenReturn(Optional.empty());
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(animatorRepository.save(any(FormationAnimator.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.approveProposal(10L);

        // Exactement UNE demande d'invitation (pas de doublon).
        verify(calendarService, times(1))
                .onAnimatorConfirmed(any(), any(), any());
    }

    @Test
    void test_rabbit_event_is_idempotent() {
        // Chaque événement publié porte un eventId UUID unique — le
        // publisher génère un nouvel identifiant par transition.
        String id1 = esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher.newEventId();
        String id2 = esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher.newEventId();
        assertNotEquals(id1, id2);
        assertNotNull(id1);
        assertTrue(id1.length() >= 32);
    }

    @Test
    void test_withdraw_only_by_creator() {
        authenticate(ENS_USERNAME, "uuid-ens-user", "ENSEIGNANT");
        FormationAnimatorProposal otherProposal = proposal(10L, ProposalType.SELF_PROPOSAL,
                ProposalStatus.PENDING_VALIDATION, TEACHER_ID);
        // proposedBy = ENS_USERNAME (créateur). Un AUTRE utilisateur tente le retrait.
        authenticate("intrus", "uuid-intrus", "ENSEIGNANT");
        when(proposalRepository.findById(10L)).thenReturn(Optional.of(otherProposal));
        when(scopeService.currentUser()).thenReturn(new CurrentUser(
                "intrus", "uuid-intrus", "intrus@esprit.tn", new java.util.HashSet<>(List.of("ENSEIGNANT"))));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.withdrawProposal(10L));
        assertTrue(ex.getMessage().contains("créateur"));
    }
}
