package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import tn.esprit.d2f.competence.dto.PerimetreAffectationDTO;
import tn.esprit.d2f.competence.repository.EnseignantScopePort;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AffectationScopeService - périmètre des affectations")
class AffectationScopeServiceTest {

    private static final String CUP_USER_ID = "user-cup";
    private static final String CUP_MAIL = "cup@esprit.tn";
    private static final String ENS_DANS_UP = "E00011";
    private static final String ENS_HORS_UP = "E00007";

    @Mock EnseignantScopePort enseignantScopePort;
    @InjectMocks AffectationScopeService scopedService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private static void authenticateWithJwt(String scope, String userId, String email) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS512")
                .claim("scope", scope)
                .claim("userId", userId)
                .claim("email", email)
                .claim("sub", email)
                .build();
        // Le principal doit être le Jwt (les claims sont lus directement par le
        // service). `UsernamePasswordAuthenticationToken` garantit un contexte
        // authentifié, sans dépendre des règles du converter OAuth2.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, List.of()));
    }

    private static void authenticateWithRole(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test", "n/a", List.of(new SimpleGrantedAuthority(role))));
    }

    private void stubCupFiche() {
        when(enseignantScopePort.findOwnFiche(CUP_USER_ID, CUP_MAIL))
                .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_GC", "DEPT_GC")));
    }

    // ── ADMIN ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("ADMIN")
    class Admin {

        @Test
        void shouldHaveGlobalPerimeter() {
            authenticateWithRole("ROLE_ADMIN");

            AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

            assertThat(perimetre.global()).isTrue();
            assertThat(perimetre.enseignantIds()).isEmpty();
            assertThatCode(() -> scopedService.assertCanManage("N_IMPORTE_QUI")).doesNotThrowAnyException();
        }

        @Test
        void shouldDescribeGlobalPerimeter() {
            authenticateWithRole("ROLE_ADMIN");

            PerimetreAffectationDTO dto = scopedService.describePerimetre();

            assertThat(dto.isGlobal()).isTrue();
            assertThat(dto.getEnseignantIds()).isEmpty();
        }
    }

    // ── CUP ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("CUP")
    class Cup {

        @Test
        void shouldScopeToOwnUp() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            stubCupFiche();
            when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));

            AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

            assertThat(perimetre.global()).isFalse();
            assertThat(perimetre.upId()).isEqualTo("UP_GC");
            assertThat(perimetre.deptId()).isNull();
            assertThat(perimetre.enseignantIds()).containsExactly(ENS_DANS_UP);
        }

        @Test
        void shouldAllowTeacherOfOwnUp() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            stubCupFiche();
            when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));
            when(enseignantScopePort.findById(ENS_DANS_UP))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_GC", "DEPT_GC")));

            assertThatCode(() -> scopedService.assertCanManage(ENS_DANS_UP))
                    .doesNotThrowAnyException();
        }

        @Test
        void shouldRefuseTeacherOfAnotherUp() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            stubCupFiche();
            when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));
            when(enseignantScopePort.findById(ENS_HORS_UP))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_INFO", "DEPT_INFO")));

            assertThatThrownBy(() -> scopedService.assertCanManage(ENS_HORS_UP))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("périmètre");
        }

        @Test
        void shouldRefuseUnknownTeacher() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            stubCupFiche();
            when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));
            when(enseignantScopePort.findById("E99999")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> scopedService.assertCanManage("E99999"))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void shouldHaveEmptyPerimeterWithoutTeacherRecord() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            when(enseignantScopePort.findOwnFiche(CUP_USER_ID, CUP_MAIL)).thenReturn(Optional.empty());

            AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

            assertThat(perimetre.global()).isFalse();
            assertThat(perimetre.upId()).isNull();
            assertThat(perimetre.deptId()).isNull();
            assertThat(perimetre.enseignantIds()).isEmpty();
            assertThatThrownBy(() -> scopedService.assertCanManage(ENS_DANS_UP))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void shouldHaveEmptyPerimeterWhenUpNotConfigured() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            when(enseignantScopePort.findOwnFiche(CUP_USER_ID, CUP_MAIL))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche(null, null)));

            AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

            assertThat(perimetre.upId()).isEqualTo(AffectationScopeService.NO_SCOPE_ID);
            assertThat(perimetre.enseignantIds()).isEmpty();
            assertThatThrownBy(() -> scopedService.assertCanManage(ENS_DANS_UP))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void shouldRefuseEmptyTeacherId() {
            authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
            stubCupFiche();
            when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));

            assertThatThrownBy(() -> scopedService.assertCanManage("  "))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    // ── CHEF DE DÉPARTEMENT ──────────────────────────────────────────────────

    @Nested
    @DisplayName("CHEF_DEPARTEMENT")
    class Chef {

        @Test
        void shouldScopeToOwnDepartment() {
            authenticateWithJwt("ROLE_CHEF_DEPARTEMENT", "user-chef", "chef@esprit.tn");
            when(enseignantScopePort.findOwnFiche("user-chef", "chef@esprit.tn"))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_RT", "DEPT_RT")));
            when(enseignantScopePort.findIds(null, "DEPT_RT")).thenReturn(List.of("E00012"));

            AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

            assertThat(perimetre.upId()).isNull();
            assertThat(perimetre.deptId()).isEqualTo("DEPT_RT");
            assertThat(perimetre.enseignantIds()).containsExactly("E00012");
        }

        @Test
        void shouldAllowTeacherOfOwnDepartment() {
            authenticateWithJwt("ROLE_CHEF_DEPARTEMENT", "user-chef", "chef@esprit.tn");
            when(enseignantScopePort.findOwnFiche("user-chef", "chef@esprit.tn"))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_RT", "DEPT_RT")));
            when(enseignantScopePort.findIds(null, "DEPT_RT")).thenReturn(List.of("E00012"));
            when(enseignantScopePort.findById("E00012"))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_INFO", "DEPT_RT")));

            assertThatCode(() -> scopedService.assertCanManage("E00012")).doesNotThrowAnyException();
        }

        @Test
        void shouldRefuseTeacherOfAnotherDepartment() {
            authenticateWithJwt("ROLE_CHEF_DEPARTEMENT", "user-chef", "chef@esprit.tn");
            when(enseignantScopePort.findOwnFiche("user-chef", "chef@esprit.tn"))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_RT", "DEPT_RT")));
            when(enseignantScopePort.findIds(null, "DEPT_RT")).thenReturn(List.of("E00012"));
            when(enseignantScopePort.findById(ENS_HORS_UP))
                    .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_INFO", "DEPT_INFO")));

            assertThatThrownBy(() -> scopedService.assertCanManage(ENS_HORS_UP))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    // ── CUMUL CUP + CHEF ─────────────────────────────────────────────────────

    @Test
    @DisplayName("CUP et chef cumulés : union UP + département")
    void shouldUnionBothScopesWhenCumulated() {
        authenticateWithJwt("ROLE_CUP ROLE_CHEF_DEPARTEMENT", CUP_USER_ID, CUP_MAIL);
        when(enseignantScopePort.findOwnFiche(CUP_USER_ID, CUP_MAIL))
                .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_GC", "DEPT_RT")));
        when(enseignantScopePort.findIds("UP_GC", "DEPT_RT"))
                .thenReturn(List.of(ENS_DANS_UP, "E00012"));
        // Enseignant hors UP mais dans le département : autorisé par le second périmètre.
        when(enseignantScopePort.findById("E00012"))
                .thenReturn(Optional.of(new EnseignantScopePort.Fiche("UP_INFO", "DEPT_RT")));

        assertThatCode(() -> scopedService.assertCanManage("E00012")).doesNotThrowAnyException();
    }

    // ── Rôles non habilités / anonyme ────────────────────────────────────────

    @Test
    @DisplayName("rôle sans droit d'écriture : périmètre vide")
    void shouldGiveEmptyPerimeterToOtherRoles() {
        authenticateWithJwt("ROLE_ENSEIGNANT", "user-ens", "ens@esprit.tn");

        AffectationScopeService.Perimetre perimetre = scopedService.currentPerimetre();

        assertThat(perimetre.global()).isFalse();
        assertThat(perimetre.enseignantIds()).isEmpty();
        assertThatThrownBy(() -> scopedService.assertCanManage(ENS_DANS_UP))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("non authentifié : refus explicite")
    void shouldRefuseWithoutAuthentication() {
        assertThatThrownBy(() -> scopedService.currentPerimetre())
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Authentification");
    }

    @Test
    @DisplayName("périmètre décrit pour le frontend (CUP)")
    void shouldDescribeCupPerimeter() {
        authenticateWithJwt("ROLE_CUP", CUP_USER_ID, CUP_MAIL);
        lenient().when(enseignantScopePort.findIds("UP_GC", null)).thenReturn(List.of(ENS_DANS_UP));
        stubCupFiche();

        PerimetreAffectationDTO dto = scopedService.describePerimetre();

        assertThat(dto.isGlobal()).isFalse();
        assertThat(dto.getUpId()).isEqualTo("UP_GC");
        assertThat(dto.getDeptId()).isNull();
        assertThat(dto.getEnseignantIds()).containsExactly(ENS_DANS_UP);
    }
}
