package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.services.CurrentUser;
import esprit.pfe.serviceformation.services.animator.AnimatorScopeService.ResolvedAnimatorScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Tests du service de périmètre d'animation : résolution du scope depuis le
 * JWT (CUP → UP, CHEF → département, ADMIN → global) et contrôle
 * d'appartenance des formations/proposés au périmètre.
 */
@ExtendWith(MockitoExtension.class)
class AnimatorScopeServiceTest {

    @Mock
    private EnseignantRepository enseignantRepository;
    @Mock
    private FormationRepository formationRepository;

    private AnimatorScopeService service;

    private static final String CHEF_USERNAME = "chef-user";
    private static final String CUP_USERNAME = "cup-user";
    private static final String ENS_USERNAME = "ens-user";

    @BeforeEach
    void setUp() {
        service = new AnimatorScopeService(enseignantRepository, formationRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void authenticate(String username, String userId, String... roles) {
        String scope = String.join(" ", java.util.Arrays.stream(roles).map(r -> "ROLE_" + r).toList());
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(username)
                .claim("userId", userId)
                .claim("email", username + "@esprit.tn")
                .claim("scope", scope)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        jwt, null, List.of()));
    }

    private Enseignant fiche(String id, String userId, String upId, String deptId) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setUserId(userId);
        e.setMail(userId + "@esprit.tn");
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

    private Formation formation(Long id, String upId, String deptId) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation("Formation " + id);
        if (upId != null) {
            Up up = new Up();
            up.setId(upId);
            f.setUp(up);
        }
        if (deptId != null) {
            Dept dept = new Dept();
            dept.setId(deptId);
            f.setDepartement(dept);
        }
        return f;
    }

    // ── currentUser ──────────────────────────────────────────────────────

    @Test
    void currentUser_sansAuthentification_leve403() {
        SecurityContextHolder.getContext().setAuthentication(null);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> service.currentUser());
        assertEquals("Authentification requise.", ex.getMessage());
    }

    @Test
    void currentUser_principalNonJwt_leve403() {
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "plain", null, List.of()));
        assertThrows(AccessDeniedException.class, () -> service.currentUser());
    }

    @Test
    void currentUser_jwtValide_extraitRolesNormalises() {
        authenticate(ENS_USERNAME, "uuid-ens", "ENSEIGNANT");
        CurrentUser user = service.currentUser();
        assertNotNull(user);
        assertTrue(user.hasRole("ENSEIGNANT"));
        assertEquals(ENS_USERNAME, user.username());
    }

    // ── resolveScope ─────────────────────────────────────────────────────

    @Test
    void resolveScope_admin_estGlobal() {
        authenticate("boss", "uuid-boss", "ADMIN");
        ResolvedAnimatorScope scope = service.resolveScope();
        assertTrue(scope.global());
        assertNull(scope.upCode());
        assertNull(scope.departmentCode());
    }

    @Test
    void resolveScope_chefDepartement_resoluParFiche() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));

        ResolvedAnimatorScope scope = service.resolveScope();
        assertFalse(scope.global());
        assertEquals("DEPT_GL", scope.departmentCode());
        assertNull(scope.upCode());
        assertTrue(scope.user().hasRole("CHEF_DEPARTEMENT"));
    }

    @Test
    void resolveScope_chefDepartement_sansFiche_repliParEmail() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef")).thenReturn(Optional.empty());
        when(enseignantRepository.findByMailIgnoreCase(CHEF_USERNAME + "@esprit.tn"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));

        ResolvedAnimatorScope scope = service.resolveScope();
        assertEquals("DEPT_GL", scope.departmentCode());
    }

    @Test
    void resolveScope_chefDepartement_sansDepartement_leve403() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, null)));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> service.resolveScope());
        assertTrue(ex.getMessage().contains("département"));
    }

    @Test
    void resolveScope_chefDepartement_ficheIntrouvable_leve403() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        lenient().when(enseignantRepository.findByUserId("uuid-chef")).thenReturn(Optional.empty());
        lenient().when(enseignantRepository.findByMailIgnoreCase(anyString())).thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> service.resolveScope());
    }

    @Test
    void resolveScope_cup_resoluParFiche() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));

        ResolvedAnimatorScope scope = service.resolveScope();
        assertFalse(scope.global());
        assertEquals("UP_INFO", scope.upCode());
        assertNull(scope.departmentCode());
    }

    @Test
    void resolveScope_cup_sansUp_leve403() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", null, "DEPT_GL")));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> service.resolveScope());
        assertTrue(ex.getMessage().contains("UP"));
    }

    @Test
    void resolveScope_enseignant_sansRestriction() {
        authenticate(ENS_USERNAME, "uuid-ens", "ENSEIGNANT");
        ResolvedAnimatorScope scope = service.resolveScope();
        assertFalse(scope.global());
        assertNull(scope.upCode());
        assertNull(scope.departmentCode());
    }

    // ── ensureCanManageFormation ────────────────────────────────────────

    @Test
    void ensureCanManageFormation_admin_toujoursAutorise() {
        authenticate("boss", "uuid-boss", "ADMIN");
        ResolvedAnimatorScope scope = service.resolveScope();
        assertDoesNotThrow(() -> service.ensureCanManageFormation(
                formation(1L, "UP_AUTRE", "DEPT_AUTRE"), scope));
    }

    @Test
    void ensureCanManageFormation_cup_dansSonUp() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertDoesNotThrow(() -> service.ensureCanManageFormation(
                formation(1L, "UP_INFO", "DEPT_GL"), scope));
    }

    @Test
    void ensureCanManageFormation_cup_horsUp_leve403() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));
        ResolvedAnimatorScope scope = service.resolveScope();

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.ensureCanManageFormation(formation(1L, "UP_AUTRE", null), scope));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre UP"));
    }

    @Test
    void ensureCanManageFormation_cup_formationSansUp_leve403() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertThrows(AccessDeniedException.class,
                () -> service.ensureCanManageFormation(formation(1L, null, null), scope));
    }

    @Test
    void ensureCanManageFormation_chef_dansSonDepartement() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertDoesNotThrow(() -> service.ensureCanManageFormation(
                formation(1L, "UP_INFO", "DEPT_GL"), scope));
    }

    @Test
    void ensureCanManageFormation_chef_horsDepartement_leve403() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));
        ResolvedAnimatorScope scope = service.resolveScope();

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.ensureCanManageFormation(formation(1L, null, "DEPT_AUTRE"), scope));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre département"));
    }

    @Test
    void ensureCanManageFormation_enseignant_autoriseSurTouteFormation() {
        authenticate(ENS_USERNAME, "uuid-ens", "ENSEIGNANT");
        ResolvedAnimatorScope scope = service.resolveScope();
        assertDoesNotThrow(() -> service.ensureCanManageFormation(
                formation(1L, "UP_X", "DEPT_Y"), scope));
    }

    // ── ensureProposerInScope ───────────────────────────────────────────

    @Test
    void ensureProposerInScope_admin_toujoursAutorise() {
        authenticate("boss", "uuid-boss", "ADMIN");
        ResolvedAnimatorScope scope = service.resolveScope();
        assertDoesNotThrow(() -> service.ensureProposerInScope(
                fiche("E009", "uuid-9", "UP_AUTRE", "DEPT_AUTRE"), scope));
    }

    @Test
    void ensureProposerInScope_cup_enseignantDeSonUp() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertDoesNotThrow(() -> service.ensureProposerInScope(
                fiche("E010", "uuid-10", "UP_INFO", "DEPT_GL"), scope));
    }

    @Test
    void ensureProposerInScope_cup_enseignantHorsUp_leve403() {
        authenticate(CUP_USERNAME, "uuid-cup", "CUP");
        when(enseignantRepository.findByUserId("uuid-cup"))
                .thenReturn(Optional.of(fiche("E002", "uuid-cup", "UP_INFO", null)));
        ResolvedAnimatorScope scope = service.resolveScope();

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.ensureProposerInScope(
                        fiche("E010", "uuid-10", "UP_AUTRE", "DEPT_GL"), scope));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre UP"));
    }

    @Test
    void ensureProposerInScope_chef_enseignantDeSonDepartement() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertDoesNotThrow(() -> service.ensureProposerInScope(
                fiche("E010", "uuid-10", "UP_INFO", "DEPT_GL"), scope));
    }

    @Test
    void ensureProposerInScope_chef_enseignantHorsDepartement_leve403() {
        authenticate(CHEF_USERNAME, "uuid-chef", "CHEF_DEPARTEMENT");
        when(enseignantRepository.findByUserId("uuid-chef"))
                .thenReturn(Optional.of(fiche("E001", "uuid-chef", null, "DEPT_GL")));
        ResolvedAnimatorScope scope = service.resolveScope();

        assertThrows(AccessDeniedException.class,
                () -> service.ensureProposerInScope(
                        fiche("E010", "uuid-10", "UP_INFO", "DEPT_AUTRE"), scope));
    }

    // ── requireFormation ────────────────────────────────────────────────

    @Test
    void requireFormation_existante() {
        Formation f = formation(1L, "UP_INFO", null);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        assertEquals(f, service.requireFormation(1L));
    }

    @Test
    void requireFormation_inexistante_leve404() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.requireFormation(99L));
        assertTrue(ex.getMessage().contains("Formation introuvable"));
    }
}
