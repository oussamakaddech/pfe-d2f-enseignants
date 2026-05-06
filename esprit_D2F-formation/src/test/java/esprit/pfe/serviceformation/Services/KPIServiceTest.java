package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KPIService - Tests unitaires")
class KPIServiceTest {

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

    @InjectMocks
    private KPIService kpiService;

    private Date start;
    private Date end;

    @BeforeEach
    void setUp() {
        start = new Date(System.currentTimeMillis() - 86400000L * 10); // 10 jours avant
        end = new Date(System.currentTimeMillis() + 86400000L * 10); // 10 jours après
    }

    @Test
    @DisplayName("Compte total des formations")
    void shouldCountTotalFormations() {
        when(formationRepository.countTotalFormations(start, end)).thenReturn(5);

        int result = kpiService.countTotalFormations(start, end);

        assertThat(result).isEqualTo(5);
        verify(formationRepository).countTotalFormations(start, end);
    }

    @Test
    @DisplayName("Calcule total des heures de formation")
    void shouldCalculateTotalHeures() {
        when(formationRepository.sumTotalHeures(start, end)).thenReturn(100);

        int result = kpiService.calculateTotalHeures(start, end);

        assertThat(result).isEqualTo(100);
        verify(formationRepository).sumTotalHeures(start, end);
    }

    @Test
    @DisplayName("Compte participants uniques")
    void shouldCountUniqueParticipants() {
        when(formationRepository.countUniqueParticipants(start, end)).thenReturn(20);

        int result = kpiService.countUniqueParticipants(start, end);

        assertThat(result).isEqualTo(20);
        verify(formationRepository).countUniqueParticipants(start, end);
    }

    @Test
    @DisplayName("Retourne les formations par état")
    void shouldGetFormationsByEtat() {
        List<Object[]> mockResults = new ArrayList<>();
        mockResults.add(new Object[]{EtatFormation.ENREGISTRE, 2L});
        mockResults.add(new Object[]{EtatFormation.PLANIFIE, 3L});

        when(formationRepository.countFormationsByEtat(start, end)).thenReturn(mockResults);

        FormationsByEtatDTO result = kpiService.getFormationsByEtat(start, end);

        assertThat(result.getEnregistre()).isEqualTo(2);
        assertThat(result.getPlanifie()).isEqualTo(3);
        assertThat(result.getEnCours()).isEqualTo(0);
        assertThat(result.getTotal()).isEqualTo(5);
    }

    @Test
    @DisplayName("Retourne le top des participants")
    void shouldGetTopParticipants() {
        List<EnseignantStatsDTO> mockList = List.of(new EnseignantStatsDTO("E1", "Nom", "Prenom", 5L));
        when(presenceRepository.findTopParticipants(null, null, start, end, EtatFormation.ACHEVE)).thenReturn(mockList);

        List<EnseignantStatsDTO> result = kpiService.getTopParticipants(null, null, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEnseignantId()).isEqualTo("E1");
        assertThat(result.get(0).getTotalPresences()).isEqualTo(5L);
    }

    @Test
    @DisplayName("Retourne le top des absents")
    void shouldGetTopAbsentees() {
        List<EnseignantStatsDTO> mockList = List.of(new EnseignantStatsDTO("E2", "Nom2", "Prenom2", 3L));
        when(presenceRepository.findTopAbsentees(null, null, start, end, EtatFormation.ACHEVE)).thenReturn(mockList);

        List<EnseignantStatsDTO> result = kpiService.getTopAbsentees(null, null, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEnseignantId()).isEqualTo("E2");
    }
}
