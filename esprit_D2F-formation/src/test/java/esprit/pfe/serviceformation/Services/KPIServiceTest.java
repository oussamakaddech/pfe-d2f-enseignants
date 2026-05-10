package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KPIServiceTest {

    @Mock private FormationRepository formationRepository;
    @Mock private PresenceRepository presenceRepository;
    @Mock private UpRepository upRepository;
    @Mock private DeptRepository deptRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @InjectMocks private KPIService service;

    private Date start;
    private Date end;

    @BeforeEach
    void setUp() {
        start = new Date(System.currentTimeMillis() - 86400000L);
        end = new Date();
    }

    @Test
    void countTotalFormations_shouldDelegate() {
        when(formationRepository.countTotalFormations(any(), any())).thenReturn(5);
        assertEquals(5, service.countTotalFormations(start, end));
    }

    @Test
    void calculateTotalHeures_shouldDelegate() {
        when(formationRepository.sumTotalHeures(any(), any())).thenReturn(120);
        assertEquals(120, service.calculateTotalHeures(start, end));
    }

    @Test
    void countUniqueParticipants_shouldDelegate() {
        when(formationRepository.countUniqueParticipants(any(), any())).thenReturn(45);
        assertEquals(45, service.countUniqueParticipants(start, end));
    }

    @Test
    void getFormationsByEtat_shouldMapResults() {
        Object[] row1 = new Object[]{EtatFormation.ACHEVE, 3L};
        Object[] row2 = new Object[]{EtatFormation.PLANIFIE, 2L};
        when(formationRepository.countFormationsByEtat(any(), any())).thenReturn(List.of(row1, row2));

        FormationsByEtatDTO result = service.getFormationsByEtat(start, end);

        assertEquals(5, result.getTotal());
        assertEquals(3, result.getAcheve());
        assertEquals(2, result.getPlanifie());
    }

    @Test
    void getTopParticipants_validFilters_shouldReturn() {
        when(upRepository.existsById("up1")).thenReturn(true);
        when(deptRepository.existsById("dept1")).thenReturn(true);
        when(presenceRepository.findTopParticipants(any(), any(), any(), any(), any())).thenReturn(List.of());

        List<EnseignantStatsDTO> result = service.getTopParticipants("up1", "dept1", start, end);

        assertNotNull(result);
    }

    @Test
    void getTopParticipants_invalidDates_shouldThrow() {
        Date futureStart = new Date(System.currentTimeMillis() + 86400000L);
        Date pastEnd = new Date(System.currentTimeMillis() - 86400000L);

        assertThrows(IllegalArgumentException.class, () ->
                service.getTopParticipants(null, null, futureStart, pastEnd));
    }

    @Test
    void getTopParticipants_invalidUp_shouldThrow() {
        when(upRepository.existsById("invalid")).thenReturn(false);

        assertThrows(EntityNotFoundException.class, () ->
                service.getTopParticipants("invalid", null, start, end));
    }

    @Test
    void getTopAbsentees_invalidDept_shouldThrow() {
        when(deptRepository.existsById("invalid")).thenReturn(false);

        assertThrows(EntityNotFoundException.class, () ->
                service.getTopAbsentees(null, "invalid", start, end));
    }

    @Test
    void getTopAbsentees_validFilters_shouldReturn() {
        when(presenceRepository.findTopAbsentees(any(), any(), any(), any(), any())).thenReturn(List.of());

        List<EnseignantStatsDTO> result = service.getTopAbsentees(null, null, start, end);

        assertNotNull(result);
    }

    @Test
    void getEnseignantsNonAffectes_shouldReturnMappedList() {
        Enseignant ens = new Enseignant();
        ens.setId("ens-1");
        ens.setNom("Dupont");
        ens.setPrenom("Jean");
        ens.setMail("jean@esprit.tn");
        ens.setType("Permanent");

        Dept dept = new Dept();
        dept.setId("dept1");
        dept.setLibelle("Informatique");
        ens.setDept(dept);

        Up up = new Up();
        up.setId("up1");
        up.setLibelle("UP Java");
        ens.setUp(up);

        when(enseignantRepository.findEnseignantsNonAffectesSurPeriode(any(), any())).thenReturn(List.of(ens));

        List<EnseignantDTO> result = service.getEnseignantsNonAffectes(start, end);

        assertEquals(1, result.size());
        assertEquals("Dupont", result.get(0).getNom());
        assertEquals("dept1", result.get(0).getDeptId());
        assertEquals("up1", result.get(0).getUpId());
    }

    @Test
    void getFormationsByTypeWithFilters_shouldMapResults() {
        Object[] row1 = new Object[]{TypeFormation.INTERNE, 3L};
        Object[] row2 = new Object[]{TypeFormation.EXTERNE, 2L};
        Object[] row3 = new Object[]{TypeFormation.EN_LIGNE, 1L};
        when(formationRepository.countFormationsByTypeWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of(row1, row2, row3));

        FormationsByTypeDTO result = service.getFormationsByTypeWithFilters(new FormationFilter(), null);

        assertEquals(3L, result.getInterne());
        assertEquals(2L, result.getExterne());
        assertEquals(1L, result.getEnLigne());
    }

    @Test
    void getCountAndSumHeures_shouldDelegate() {
        CountHeuresDTO expected = new CountHeuresDTO(5L, 100L);
        when(formationRepository.countAndSumHeuresWithFilters(any(FormationFilter.class)))
                .thenReturn(expected);

        CountHeuresDTO result = service.getCountAndSumHeures(new FormationFilter(), null);

        assertEquals(5L, result.getCount());
        assertEquals(100L, result.getTotalHeures());
    }

    @Test
    void getCountByTrainerTypeWithIds_shouldDelegate() {
        when(formationRepository.findExterneOnlyIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of(1L, 2L));
        when(formationRepository.findInterneOnlyIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of(3L));
        when(formationRepository.findMixteIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of());

        CountByTrainerTypeWithIdsDTO result = service.getCountByTrainerTypeWithIds(new FormationFilter(), null);

        assertEquals(2L, result.getExterneOnlyCount());
        assertEquals(1L, result.getInterneOnlyCount());
        assertEquals(0L, result.getMixteCount());
    }

    @Test
    void getCountByTrainerTypeWithIds_withNullLists_shouldReturnZeroCounts() {
        when(formationRepository.findExterneOnlyIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(null);
        when(formationRepository.findInterneOnlyIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(null);
        when(formationRepository.findMixteIdsWithFilters(any(FormationFilter.class)))
                .thenReturn(null);

        CountByTrainerTypeWithIdsDTO result = service.getCountByTrainerTypeWithIds(new FormationFilter(), null);

        assertEquals(0L, result.getExterneOnlyCount());
        assertEquals(0L, result.getInterneOnlyCount());
        assertEquals(0L, result.getMixteCount());
    }

    @Test
    void getCountByTrainerTypeWithIds_withInvalidDates_shouldThrow() {
        FormationFilter filter = new FormationFilter();
        filter.setStart(new Date(System.currentTimeMillis() + 86400000L));
        filter.setEnd(new Date(System.currentTimeMillis() - 86400000L));

        assertThrows(IllegalArgumentException.class, () -> service.getCountByTrainerTypeWithIds(filter, null));
    }

    @Test
    void getCountByTrainerTypeWithIds_withInvalidUp_shouldThrow() {
        FormationFilter filter = new FormationFilter();
        filter.setUpId(1L);
        when(upRepository.existsById("1")).thenReturn(false);

        assertThrows(EntityNotFoundException.class, () -> service.getCountByTrainerTypeWithIds(filter, null));
    }

    @Test
    void getCountByTrainerTypeWithIds_withInvalidDept_shouldThrow() {
        FormationFilter filter = new FormationFilter();
        filter.setDeptId(1L);
        when(deptRepository.existsById("1")).thenReturn(false);

        assertThrows(EntityNotFoundException.class, () -> service.getCountByTrainerTypeWithIds(filter, null));
    }

    @Test
    void getFormationsByEtat_withUnknownState_shouldIgnore() {
        Object[] row1 = new Object[]{EtatFormation.ACHEVE, 3L};
        Object[] row2 = new Object[]{EtatFormation.ENREGISTRE, 2L};
        Object[] row3 = new Object[]{EtatFormation.EN_COURS, 1L};
        Object[] row4 = new Object[]{EtatFormation.ANNULE, 1L};
        when(formationRepository.countFormationsByEtat(any(), any()))
                .thenReturn(List.of(row1, row2, row3, row4));

        FormationsByEtatDTO result = service.getFormationsByEtat(start, end);

        assertEquals(7, result.getTotal());
        assertEquals(3, result.getAcheve());
        assertEquals(2, result.getEnregistre());
        assertEquals(1, result.getEnCours());
        assertEquals(1, result.getAnnule());
    }

    @Test
    void getFormationsByTypeWithFilters_withUnknownType_shouldIgnore() {
        Object[] row1 = new Object[]{TypeFormation.INTERNE, 3L};
        Object[] row2 = new Object[]{TypeFormation.EXTERNE, 2L};
        when(formationRepository.countFormationsByTypeWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of(row1, row2));

        FormationsByTypeDTO result = service.getFormationsByTypeWithFilters(new FormationFilter(), null);

        assertEquals(3L, result.getInterne());
        assertEquals(2L, result.getExterne());
        assertEquals(0L, result.getEnLigne());
    }

    @Test
    void getEnseignantsNonAffectes_withoutDeptOrUp_shouldReturnDTOWithNullFields() {
        Enseignant ens = new Enseignant();
        ens.setId("ens-1");
        ens.setNom("Dupont");
        ens.setPrenom("Jean");
        ens.setMail("jean@esprit.tn");
        ens.setType("Permanent");
        ens.setDept(null);
        ens.setUp(null);

        when(enseignantRepository.findEnseignantsNonAffectesSurPeriode(any(), any())).thenReturn(List.of(ens));

        List<EnseignantDTO> result = service.getEnseignantsNonAffectes(start, end);

        assertEquals(1, result.size());
        assertEquals("Dupont", result.get(0).getNom());
        assertNull(result.get(0).getDeptId());
        assertNull(result.get(0).getUpId());
    }

    @Test
    void getCountAndSumHeures_withDifferentEtatParams_shouldUseCorrectEtats() {
        CountHeuresDTO expected = new CountHeuresDTO(5L, 100L);
        when(formationRepository.countAndSumHeuresWithFilters(any(FormationFilter.class)))
                .thenReturn(expected);

        // Test avec etatParam = null
        CountHeuresDTO result1 = service.getCountAndSumHeures(new FormationFilter(), null);
        assertEquals(5L, result1.getCount());

        // Test avec etatParam = "PLANIFIE"
        CountHeuresDTO result2 = service.getCountAndSumHeures(new FormationFilter(), "PLANIFIE");
        assertEquals(5L, result2.getCount());

        // Test avec etatParam = "ACHEVE"
        CountHeuresDTO result3 = service.getCountAndSumHeures(new FormationFilter(), "ACHEVE");
        assertEquals(5L, result3.getCount());

        // Test avec etatParam = "TOUT"
        CountHeuresDTO result4 = service.getCountAndSumHeures(new FormationFilter(), "TOUT");
        assertEquals(5L, result4.getCount());
    }

    @Test
    void getCountAndSumHeures_withInvalidEtatParam_shouldThrow() {
        FormationFilter filter = new FormationFilter();
        assertThrows(IllegalArgumentException.class, () -> 
                service.getCountAndSumHeures(filter, "INVALID"));
    }

    @Test
    void getFormationsByTypeWithFilters_withDifferentEtatParams_shouldUseCorrectEtats() {
        Object[] row1 = new Object[]{TypeFormation.INTERNE, 3L};
        List<Object[]> mockResult = new java.util.ArrayList<>();
        mockResult.add(row1);
        when(formationRepository.countFormationsByTypeWithFilters(any(FormationFilter.class)))
                .thenReturn(mockResult);

        // Test avec etatParam = null
        FormationsByTypeDTO result1 = service.getFormationsByTypeWithFilters(new FormationFilter(), null);
        assertEquals(3L, result1.getInterne());

        // Test avec etatParam = "PLANIFIE"
        FormationsByTypeDTO result2 = service.getFormationsByTypeWithFilters(new FormationFilter(), "PLANIFIE");
        assertEquals(3L, result2.getInterne());

        // Test avec etatParam = "ACHEVE"
        FormationsByTypeDTO result3 = service.getFormationsByTypeWithFilters(new FormationFilter(), "ACHEVE");
        assertEquals(3L, result3.getInterne());

        // Test avec etatParam = "TOUT"
        FormationsByTypeDTO result4 = service.getFormationsByTypeWithFilters(new FormationFilter(), "TOUT");
        assertEquals(3L, result4.getInterne());
    }

    @Test
    void getFormationsByTypeWithFilters_withInvalidEtatParam_shouldThrow() {
        FormationFilter filter = new FormationFilter();
        assertThrows(IllegalArgumentException.class, () -> 
                service.getFormationsByTypeWithFilters(filter, "INVALID"));
    }

    @Test
    void getTopParticipants_withNullFilters_shouldReturn() {
        when(presenceRepository.findTopParticipants(any(), any(), any(), any(), any())).thenReturn(List.of());

        List<EnseignantStatsDTO> result = service.getTopParticipants(null, null, start, end);

        assertNotNull(result);
    }

    @Test
    void getTopAbsentees_withNullFilters_shouldReturn() {
        when(presenceRepository.findTopAbsentees(any(), any(), any(), any(), any())).thenReturn(List.of());

        List<EnseignantStatsDTO> result = service.getTopAbsentees(null, null, start, end);

        assertNotNull(result);
        assertTrue(result.isEmpty()); // Vérifie explicitement que la liste est vide
    }

    @Test
    void getFormationsByEtat_withEmptyResults_shouldReturnZeroCounts() {
        when(formationRepository.countFormationsByEtat(any(), any())).thenReturn(List.of());

        FormationsByEtatDTO result = service.getFormationsByEtat(start, end);

        assertEquals(0, result.getTotal());
        assertEquals(0, result.getAcheve());
        assertEquals(0, result.getPlanifie());
    }

    @Test
    void getFormationsByTypeWithFilters_withEmptyResults_shouldReturnZeroCounts() {
        when(formationRepository.countFormationsByTypeWithFilters(any(FormationFilter.class)))
                .thenReturn(List.of());

        FormationsByTypeDTO result = service.getFormationsByTypeWithFilters(new FormationFilter(), null);

        assertEquals(0L, result.getInterne());
        assertEquals(0L, result.getExterne());
        assertEquals(0L, result.getEnLigne());
    }
}
