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
}
