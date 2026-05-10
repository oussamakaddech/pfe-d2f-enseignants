package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.ParticipantKpiDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ParticipantKpiService - Tests unitaires")
class ParticipantKpiServiceTest {

    @Mock private FormationRepository formationRepository;
    @Mock private PresenceRepository presenceRepository;

    @InjectMocks
    private ParticipantKpiService kpiService;

    @Test
    @DisplayName("getParticipantKpis - Succès")
    void shouldGetParticipantKpis() {
        Date start = new Date(0);
        Date end = new Date(System.currentTimeMillis() + 1000000);

        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setDateDebut(new Date());
        f.setEtatFormation(EtatFormation.ACHEVE);

        when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE)).thenReturn(List.of(f));
        when(presenceRepository.countByFormationIdAndPeriod(eq(1L), any(), any())).thenReturn(10L);
        when(presenceRepository.countPresentByFormationIdAndPeriod(eq(1L), any(), any())).thenReturn(8L);

        List<ParticipantKpiDTO> result = kpiService.getParticipantKpis(start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTauxParticipation()).isEqualTo(80.0);
    }

    @Test
    @DisplayName("getGlobalParticipantKpi - Succès")
    void shouldGetGlobalParticipantKpi() {
        Date start = new Date(0);
        Date end = new Date(System.currentTimeMillis() + 1000000);

        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setDateDebut(new Date());
        f.setEtatFormation(EtatFormation.ACHEVE);

        when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE)).thenReturn(List.of(f));
        when(presenceRepository.countByFormationIdAndPeriod(eq(1L), any(), any())).thenReturn(10L);
        when(presenceRepository.countPresentByFormationIdAndPeriod(eq(1L), any(), any())).thenReturn(5L);

        ParticipantKpiDTO result = kpiService.getGlobalParticipantKpi(start, end);

        assertThat(result.getTauxParticipation()).isEqualTo(50.0);
    }
}
