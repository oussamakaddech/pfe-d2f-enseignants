package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationFilter;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Périmètre KPI : CUP → UP, chef → département, admin → global. */
@ExtendWith(MockitoExtension.class)
class KpiScopeServiceTest {

    private static final LocalDate START = LocalDate.of(2026, 1, 1);
    private static final LocalDate END = LocalDate.of(2026, 12, 31);

    @Mock
    private FormationRepository formationRepository;
    @Mock
    private PresenceRepository presenceRepository;
    @Mock
    private UpRepository upRepository;
    @Mock
    private DeptRepository deptRepository;
    @Mock
    private EnseignantRepository enseignantRepository;
    @Mock
    private KpiScopeService kpiScopeService;

    @InjectMocks
    private KPIService kpiService;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    // ── KpiScopeService : résolution du périmètre ────────────────────────────

    private void login(String roles, String userId, String email) {
        Jwt jwt = new Jwt("token", null, null, java.util.Map.of("alg", "none"),
                java.util.Map.of("sub", "user", "scope", roles, "userId", userId, "email", email));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(jwt, null, List.of()));
    }

    private Enseignant fiche(String upId, String deptId) {
        Enseignant e = new Enseignant();
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

    @Test
    @DisplayName("admin → périmètre global")
    void adminIsGlobal() {
        login("ROLE_ADMIN", "U1", "a@esprit.tn");
        KpiScopeService.KpiScope scope = new KpiScopeService(enseignantRepository).resolveScope();
        assertTrue(scope.global());
        assertNull(scope.upId());
        assertNull(scope.deptId());
    }

    @Test
    @DisplayName("CUP avec fiche → UP de sa fiche")
    void cupScopedToHisUp() {
        login("ROLE_CUP", "U1", "a@esprit.tn");
        when(enseignantRepository.findByUserId("U1")).thenReturn(Optional.of(fiche("UP1", "D1")));
        KpiScopeService.KpiScope scope = new KpiScopeService(enseignantRepository).resolveScope();
        assertEquals("UP1", scope.upId());
        assertNull(scope.deptId());
    }

    @Test
    @DisplayName("CUP sans fiche → deny-by-default (sentinelle, jamais global)")
    void cupWithoutFicheIsEmptyScope() {
        login("ROLE_CUP", "U-NOFICHE", "x@esprit.tn");
        when(enseignantRepository.findByUserId("U-NOFICHE")).thenReturn(Optional.empty());
        when(enseignantRepository.findByMailIgnoreCase("x@esprit.tn")).thenReturn(Optional.empty());
        KpiScopeService.KpiScope scope = new KpiScopeService(enseignantRepository).resolveScope();
        assertEquals(KpiScopeService.NO_SCOPE_ID, scope.upId());
        assertFalse(scope.global());
    }

    @Test
    @DisplayName("chef avec fiche → département de sa fiche")
    void chefScopedToHisDepartment() {
        login("ROLE_CHEF_DEPARTEMENT", "U1", "a@esprit.tn");
        when(enseignantRepository.findByUserId("U1")).thenReturn(Optional.of(fiche("UP1", "D2")));
        KpiScopeService.KpiScope scope = new KpiScopeService(enseignantRepository).resolveScope();
        assertNull(scope.upId());
        assertEquals("D2", scope.deptId());
    }

    @Test
    @DisplayName("sans authentification → refusé")
    void noAuthenticationThrows() {
        assertThrows(AccessDeniedException.class,
                () -> new KpiScopeService(enseignantRepository).resolveScope());
    }

    // ── KPIService : application du périmètre aux requêtes ──────────────────

    private void stubScope(String upId, String deptId) {
        when(kpiScopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope(upId, deptId));
    }

    @Test
    @DisplayName("KPIService : CUP → agrégations forcées à son UP (variants scopés)")
    void kpiAggregationsForcedToCupUp() {
        stubScope("UP1", null);
        kpiService.countTotalFormations(START, END);
        kpiService.calculateTotalHeures(START, END);
        kpiService.countUniqueParticipants(START, END);
        kpiService.getFormationsByEtat(START, END);
        kpiService.getCountFormationsByDomaine(START, END);
        kpiService.getCountFormationsByCompetence(START, END);
        verify(formationRepository).countTotalFormationsScoped(START, END, "UP1", null);
        verify(formationRepository).sumTotalHeuresScoped(START, END, "UP1", null);
        verify(formationRepository).countUniqueParticipantsScoped(START, END, "UP1", null);
        verify(formationRepository).countFormationsByEtatScoped(START, END, "UP1", null);
        verify(formationRepository).countFormationsByDomaineScoped(START, END, "UP1", null);
        verify(formationRepository).countFormationsByCompetenceScoped(START, END, "UP1", null);
        verify(formationRepository, never()).countTotalFormations(any(), any());
    }

    @Test
    @DisplayName("KPIService : chef → top-participants forcés à son département")
    void topParticipantsForcedToChefDepartment() {
        stubScope(null, "D2");
        kpiService.getTopParticipants("UP9", "D9", START, END);
        verify(presenceRepository).findTopParticipants(isNull(), eq("D2"), eq(START), eq(END), any());
    }

    @Test
    @DisplayName("KPIService : périmètre global → les filtres client sont conservés")
    void globalScopeKeepsClientFilters() {
        stubScope(null, null);
        when(upRepository.existsById("UP9")).thenReturn(true);
        when(deptRepository.existsById("D9")).thenReturn(true);
        kpiService.getTopParticipants("UP9", "D9", START, END);
        verify(presenceRepository).findTopParticipants(eq("UP9"), eq("D9"), eq(START), eq(END), any());
    }

    @Test
    @DisplayName("KPIService : CUP → le filtre client est écrasé dans FormationFilter")
    void filterForcedToCupUp() {
        stubScope("UP1", null);
        FormationFilter filter = FormationFilter.builder().upId("UP9").deptId("D9").build();
        kpiService.getCountAndSumHeures(filter, null);
        verify(formationRepository).countAndSumHeuresWithFilters(filter);
        assertEquals("UP1", filter.getUpId());
        assertNull(filter.getDeptId());
    }

    @Test
    @DisplayName("KPIService : sentinelle → validation d'existence sautée, requête envoyée telle quelle")
    void sentinelScopeSkipsExistenceValidation() {
        stubScope(KpiScopeService.NO_SCOPE_ID, null);
        kpiService.getTopParticipants("UP9", null, START, END);
        verify(presenceRepository).findTopParticipants(eq(KpiScopeService.NO_SCOPE_ID), isNull(),
                eq(START), eq(END), any());
        verify(upRepository, never()).existsById(anyString());
    }
}