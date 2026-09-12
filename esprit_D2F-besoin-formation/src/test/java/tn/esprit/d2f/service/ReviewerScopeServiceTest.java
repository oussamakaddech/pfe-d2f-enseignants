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
import tn.esprit.d2f.entity.ReviewerScope;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.exception.ResourceNotFoundException;
import tn.esprit.d2f.repository.ReviewerScopeRepository;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewerScopeServiceTest {

    @Mock
    private ReviewerScopeRepository reviewerScopeRepository;

    private ReviewerScopeService service;

    @BeforeEach
    void setUp() {
        service = new ReviewerScopeService(reviewerScopeRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String username, String... roles) {
        List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
        for (String role : roles) {
            authorities.add(new SimpleGrantedAuthority(role));
        }
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, authorities));
    }

    // ── resolveActorRole ─────────────────────────────────────────────────────

    @Test
    void resolveActorRole_admin() {
        CreatorRole role = service.resolveActorRole(
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertEquals(CreatorRole.ADMIN, role);
    }

    @Test
    void resolveActorRole_cup() {
        CreatorRole role = service.resolveActorRole(
                List.of(new SimpleGrantedAuthority("ROLE_CUP")));
        assertEquals(CreatorRole.CUP, role);
    }

    @Test
    void resolveActorRole_chefDepartement() {
        CreatorRole role = service.resolveActorRole(
                List.of(new SimpleGrantedAuthority("ROLE_CHEF_DEPARTEMENT")));
        assertEquals(CreatorRole.CHEF_DEPARTEMENT, role);
    }

    @Test
    void resolveActorRole_enseignant() {
        CreatorRole role = service.resolveActorRole(
                List.of(new SimpleGrantedAuthority("ROLE_ENSEIGNANT")));
        assertEquals(CreatorRole.ENSEIGNANT, role);
    }

    @Test
    void resolveActorRole_animateurAssimileEnseignant() {
        CreatorRole role = service.resolveActorRole(
                List.of(new SimpleGrantedAuthority("ROLE_ANIMATEUR")));
        assertEquals(CreatorRole.ENSEIGNANT, role);
    }

    @Test
    void resolveActorRole_roleInconnu_doitLever403() {
        List<SimpleGrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority("ROLE_QUELCONQUE"));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveActorRole(authorities));
        assertTrue(ex.getMessage().contains("Rôle non reconnu"));
    }

    // ── resolveCurrentUser ───────────────────────────────────────────────────

    @Test
    void resolveCurrentUser_admin_estGlobal() {
        authenticate("boss", "ROLE_ADMIN");
        ReviewerScopeService.ResolvedScope scope = service.resolveCurrentUser();
        assertTrue(scope.global());
        assertEquals("boss", scope.username());
        assertEquals(CreatorRole.ADMIN, scope.actorRole());
        assertNull(scope.upCode());
        assertNull(scope.departmentCode());
    }

    @Test
    void resolveCurrentUser_sansAuthentification_doitLever403() {
        SecurityContextHolder.getContext().setAuthentication(null);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertEquals("Authentification requise.", ex.getMessage());
    }

    @Test
    void resolveCurrentUser_authNonAuthentifiee_doitLever403() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("x", "y"));
        assertThrows(AccessDeniedException.class, () -> service.resolveCurrentUser());
    }

    @Test
    void resolveCurrentUser_enseignant_perimetreValide() {
        authenticate("ens1", "ROLE_ENSEIGNANT");
        ReviewerScope scope = ReviewerScope.builder()
                .username("ens1").role("ROLE_ENSEIGNANT")
                .upCode("UP_INFO").departmentCode("DEPT_GL").build();
        when(reviewerScopeRepository.findById("ens1")).thenReturn(Optional.of(scope));

        ReviewerScopeService.ResolvedScope resolved = service.resolveCurrentUser();
        assertEquals("ens1", resolved.username());
        assertEquals(CreatorRole.ENSEIGNANT, resolved.actorRole());
        assertEquals("UP_INFO", resolved.upCode());
        assertEquals("DEPT_GL", resolved.departmentCode());
        assertFalse(resolved.global());
    }

    @Test
    void resolveCurrentUser_enseignant_sansPerimetre_doitLever403() {
        authenticate("ens2", "ROLE_ENSEIGNANT");
        when(reviewerScopeRepository.findById("ens2")).thenReturn(Optional.empty());
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertTrue(ex.getMessage().contains("Périmètre non configuré"));
    }

    @Test
    void resolveCurrentUser_enseignant_roleIncoherent_doitLever403() {
        authenticate("ens3", "ROLE_ENSEIGNANT");
        ReviewerScope scope = ReviewerScope.builder()
                .username("ens3").role("ROLE_CUP")
                .upCode("UP_INFO").departmentCode("DEPT_GL").build();
        when(reviewerScopeRepository.findById("ens3")).thenReturn(Optional.of(scope));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertTrue(ex.getMessage().contains("ne correspond pas"));
    }

    @Test
    void resolveCurrentUser_enseignant_perimetreIncomplet_doitLever403() {
        authenticate("ens4", "ROLE_ENSEIGNANT");
        ReviewerScope scope = ReviewerScope.builder()
                .username("ens4").role("ROLE_ENSEIGNANT")
                .upCode(null).departmentCode("DEPT_GL").build();
        when(reviewerScopeRepository.findById("ens4")).thenReturn(Optional.of(scope));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertTrue(ex.getMessage().contains("une UP et un département"));
    }

    @Test
    void resolveCurrentUser_cup_perimetreValide() {
        authenticate("cup1", "ROLE_CUP");
        ReviewerScope scope = ReviewerScope.builder()
                .username("cup1").role("ROLE_CUP")
                .upCode("UP_INFO").departmentCode(null).build();
        when(reviewerScopeRepository.findById("cup1")).thenReturn(Optional.of(scope));

        ReviewerScopeService.ResolvedScope resolved = service.resolveCurrentUser();
        assertEquals(CreatorRole.CUP, resolved.actorRole());
        assertEquals("UP_INFO", resolved.upCode());
        assertFalse(resolved.global());
    }

    @Test
    void resolveCurrentUser_cup_sansPerimetre_doitLever403() {
        authenticate("cup2", "ROLE_CUP");
        when(reviewerScopeRepository.findById("cup2")).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> service.resolveCurrentUser());
    }

    @Test
    void resolveCurrentUser_cup_roleIncoherent_doitLever403() {
        authenticate("cup3", "ROLE_CUP");
        ReviewerScope scope = ReviewerScope.builder()
                .username("cup3").role("ROLE_CHEF_DEPARTEMENT")
                .upCode("UP_INFO").departmentCode("DEPT_GL").build();
        when(reviewerScopeRepository.findById("cup3")).thenReturn(Optional.of(scope));
        assertThrows(AccessDeniedException.class, () -> service.resolveCurrentUser());
    }

    @Test
    void resolveCurrentUser_cup_sansUp_doitLever403() {
        authenticate("cup4", "ROLE_CUP");
        ReviewerScope scope = ReviewerScope.builder()
                .username("cup4").role("ROLE_CUP")
                .upCode("").departmentCode(null).build();
        when(reviewerScopeRepository.findById("cup4")).thenReturn(Optional.of(scope));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertTrue(ex.getMessage().contains("aucune UP"));
    }

    @Test
    void resolveCurrentUser_chef_perimetreValide() {
        authenticate("chef1", "ROLE_CHEF_DEPARTEMENT");
        ReviewerScope scope = ReviewerScope.builder()
                .username("chef1").role("ROLE_CHEF_DEPARTEMENT")
                .upCode(null).departmentCode("DEPT_GL").build();
        when(reviewerScopeRepository.findById("chef1")).thenReturn(Optional.of(scope));

        ReviewerScopeService.ResolvedScope resolved = service.resolveCurrentUser();
        assertEquals(CreatorRole.CHEF_DEPARTEMENT, resolved.actorRole());
        assertEquals("DEPT_GL", resolved.departmentCode());
        assertFalse(resolved.global());
    }

    @Test
    void resolveCurrentUser_chef_sansDepartement_doitLever403() {
        authenticate("chef2", "ROLE_CHEF_DEPARTEMENT");
        ReviewerScope scope = ReviewerScope.builder()
                .username("chef2").role("ROLE_CHEF_DEPARTEMENT")
                .upCode(null).departmentCode(" ").build();
        when(reviewerScopeRepository.findById("chef2")).thenReturn(Optional.of(scope));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.resolveCurrentUser());
        assertTrue(ex.getMessage().contains("aucun département"));
    }

    @Test
    void resolveCurrentUser_chef_sansPerimetre_doitLever403() {
        authenticate("chef3", "ROLE_CHEF_DEPARTEMENT");
        when(reviewerScopeRepository.findById("chef3")).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> service.resolveCurrentUser());
    }

    // ── ensureInScope ────────────────────────────────────────────────────────

    @Test
    void ensureInScope_global_toujoursAutorise() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "boss", "boss", CreatorRole.ADMIN, null, null, true);
        assertDoesNotThrow(() -> service.ensureInScope(scope, null, null, 42L));
        assertDoesNotThrow(() -> service.ensureInScope(scope, "AUTRE_UP", "AUTRE_DEPT", 43L));
    }

    @Test
    void ensureInScope_cup_besoinDansSonUp() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "cup1", "cup1", CreatorRole.CUP, "UP_INFO", null, false);
        assertDoesNotThrow(() -> service.ensureInScope(scope, "UP_INFO", "DEPT_GL", 1L));
    }

    @Test
    void ensureInScope_cup_besoinHorsUp_doitLever403() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "cup1", "cup1", CreatorRole.CUP, "UP_INFO", null, false);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.ensureInScope(scope, "UP_AUTRE", "DEPT_GL", 1L));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre UP"));
    }

    @Test
    void ensureInScope_cup_besoinSansUp_doitLever403() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "cup1", "cup1", CreatorRole.CUP, "UP_INFO", null, false);
        assertThrows(AccessDeniedException.class,
                () -> service.ensureInScope(scope, null, "DEPT_GL", 1L));
    }

    @Test
    void ensureInScope_chef_besoinDansSonDepartement() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "chef1", "chef1", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false);
        assertDoesNotThrow(() -> service.ensureInScope(scope, "UP_INFO", "DEPT_GL", 1L));
    }

    @Test
    void ensureInScope_chef_besoinHorsDepartement_doitLever403() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "chef1", "chef1", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.ensureInScope(scope, "UP_INFO", "DEPT_AUTRE", 7L));
        assertTrue(ex.getMessage().contains("n'appartient pas à votre département"));
    }

    @Test
    void ensureInScope_chef_besoinSansDepartement_doitLever403() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "chef1", "chef1", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false);
        assertThrows(AccessDeniedException.class,
                () -> service.ensureInScope(scope, "UP_INFO", null, 9L));
    }

    @Test
    void ensureInScope_enseignant_autoriseSansRestriction() {
        ReviewerScopeService.ResolvedScope scope = new ReviewerScopeService.ResolvedScope(
                "ens1", "ens1", CreatorRole.ENSEIGNANT, "UP_INFO", "DEPT_GL", false);
        assertDoesNotThrow(() -> service.ensureInScope(scope, "UP_AUTRE", "DEPT_AUTRE", 5L));
    }

    // ── Administration ───────────────────────────────────────────────────────

    @Test
    void listScopes_doitRetournerLaPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<ReviewerScope> page = new PageImpl<>(Collections.singletonList(
                ReviewerScope.builder().username("cup1").role("ROLE_CUP").build()));
        when(reviewerScopeRepository.findAll(pageable)).thenReturn(page);

        Page<ReviewerScope> result = service.listScopes(pageable);
        assertEquals(1, result.getTotalElements());
        verify(reviewerScopeRepository).findAll(pageable);
    }

    @Test
    void listAllScopes_doitRetournerTousLesPerimetres() {
        when(reviewerScopeRepository.findAll()).thenReturn(List.of(
                ReviewerScope.builder().username("cup1").role("ROLE_CUP").build(),
                ReviewerScope.builder().username("chef1").role("ROLE_CHEF_DEPARTEMENT").build()));

        List<ReviewerScope> result = service.listAllScopes();
        assertEquals(2, result.size());
        verify(reviewerScopeRepository).findAll();
    }

    @Test
    void getScope_existant() {
        ReviewerScope scope = ReviewerScope.builder()
                .username("cup1").role("ROLE_CUP").upCode("UP_INFO").build();
        when(reviewerScopeRepository.findById("cup1")).thenReturn(Optional.of(scope));

        ReviewerScope result = service.getScope("cup1");
        assertEquals("cup1", result.getUsername());
        assertEquals("ROLE_CUP", result.getRole());
    }

    @Test
    void getScope_inexistant_doitLever404() {
        when(reviewerScopeRepository.findById("inconnu")).thenReturn(Optional.empty());
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.getScope("inconnu"));
        assertTrue(ex.getMessage().contains("introuvable"));
    }

    @Test
    void upsertScope_cup_nouveau() {
        when(reviewerScopeRepository.findById("cup9")).thenReturn(Optional.empty());
        when(reviewerScopeRepository.save(any(ReviewerScope.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReviewerScope result = service.upsertScope("cup9", "ROLE_CUP", "UP_INFO", null);
        assertEquals("cup9", result.getUsername());
        assertEquals("ROLE_CUP", result.getRole());
        assertEquals("UP_INFO", result.getUpCode());
        verify(reviewerScopeRepository).save(any(ReviewerScope.class));
    }

    @Test
    void upsertScope_enseignant() {
        when(reviewerScopeRepository.findById("ens9")).thenReturn(Optional.empty());
        when(reviewerScopeRepository.save(any(ReviewerScope.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReviewerScope result = service.upsertScope("ens9", "ROLE_ENSEIGNANT", "UP_INFO", "DEPT_GL");
        assertEquals("ens9", result.getUsername());
        assertEquals("UP_INFO", result.getUpCode());
        assertEquals("DEPT_GL", result.getDepartmentCode());
    }

    @Test
    void upsertScope_chef_departementObligatoire() {
        when(reviewerScopeRepository.findById("chef9")).thenReturn(Optional.empty());
        when(reviewerScopeRepository.save(any(ReviewerScope.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReviewerScope result = service.upsertScope("chef9", "ROLE_CHEF_DEPARTEMENT", null, "DEPT_GL");
        assertEquals("DEPT_GL", result.getDepartmentCode());
        assertNull(result.getUpCode());
    }

    @Test
    void upsertScope_miseAJourExistante() {
        ReviewerScope existing = ReviewerScope.builder()
                .username("cup1").role("ROLE_CUP").upCode("UP_OLD").build();
        when(reviewerScopeRepository.findById("cup1")).thenReturn(Optional.of(existing));
        when(reviewerScopeRepository.save(any(ReviewerScope.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReviewerScope result = service.upsertScope("cup1", "ROLE_CUP", "UP_NEW", "DEPT_GL");
        assertEquals("UP_NEW", result.getUpCode());
        assertEquals("DEPT_GL", result.getDepartmentCode());
    }

    @Test
    void upsertScope_usernameVide_doitLeverIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope(" ", "ROLE_CUP", "UP_INFO", null));
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope(null, "ROLE_CUP", "UP_INFO", null));
    }

    @Test
    void upsertScope_roleInvalide_doitLeverIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope("u1", "ROLE_ADMIN", "UP_INFO", null));
    }

    @Test
    void upsertScope_cup_sansUp_doitLeverIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope("u1", "ROLE_CUP", null, null));
        assertTrue(ex.getMessage().contains("L'UP est obligatoire"));
    }

    @Test
    void upsertScope_chef_sansDepartement_doitLeverIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope("u1", "ROLE_CHEF_DEPARTEMENT", null, ""));
        assertTrue(ex.getMessage().contains("département est obligatoire"));
    }

    @Test
    void upsertScope_enseignant_sansUp_doitLeverIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope("u1", "ROLE_ENSEIGNANT", " ", "DEPT_GL"));
    }

    @Test
    void upsertScope_enseignant_sansDepartement_doitLeverIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertScope("u1", "ROLE_ENSEIGNANT", "UP_INFO", null));
    }

    @Test
    void deleteScope_existant() {
        when(reviewerScopeRepository.existsById("cup1")).thenReturn(true);
        doNothing().when(reviewerScopeRepository).deleteById("cup1");

        assertDoesNotThrow(() -> service.deleteScope("cup1"));
        verify(reviewerScopeRepository).deleteById("cup1");
    }

    @Test
    void deleteScope_inexistant_doitLever404() {
        when(reviewerScopeRepository.existsById("inconnu")).thenReturn(false);
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.deleteScope("inconnu"));
        assertTrue(ex.getMessage().contains("introuvable"));
        verify(reviewerScopeRepository, never()).deleteById(any());
    }
}
