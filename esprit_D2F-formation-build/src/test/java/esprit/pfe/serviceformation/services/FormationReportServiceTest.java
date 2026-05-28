package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormationReportServiceTest {

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private PresenceRepository presenceRepo;
    @InjectMocks private FormationReportService service;

    @Test
    void testGetFormationsParRoleEtPeriode_Animateur() {
        Formation f = new Formation();
        f.setChargeHoraireGlobal(0);
        when(seanceRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any())).thenReturn(List.of(f));
        assertFalse(service.getFormationsParRoleEtPeriode("animateur", "E1", new Date(), new Date()).isEmpty());
    }

    @Test
    void testGetFormationsParRoleEtPeriode_Participant() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setCoutFormation(0.0f);
        f.setChargeHoraireGlobal(0);
        
        when(presenceRepo.findFormationsByParticipantAndPeriod(anyString(), any(), any())).thenReturn(List.of(f));
        when(seanceRepo.findAnimateursByFormation(any())).thenReturn(Collections.emptyList());
        assertFalse(service.getFormationsParRoleEtPeriode("participant", "E1", new Date(), new Date()).isEmpty());
    }

    @Test
    void testGetFormationsParRoleEtPeriode_InvalidRole() {
        Date d1 = new Date();
        Date d2 = new Date();
        assertThrows(IllegalArgumentException.class, () -> service.getFormationsParRoleEtPeriode("invalid", "E1", d1, d2));
    }
}
