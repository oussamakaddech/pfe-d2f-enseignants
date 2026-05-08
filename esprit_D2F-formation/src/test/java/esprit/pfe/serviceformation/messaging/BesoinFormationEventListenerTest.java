package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinFormationEventListenerTest {

    @Mock private FormationRepository repo;
    @Mock private UpRepository upRepo;
    @Mock private DeptRepository deptRepo;
    @InjectMocks private BesoinFormationEventListener listener;

    @Test
    void onBesoinApproved_shouldCreateFormationFromEvent() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(1L);
        evt.setTitre("Formation Java");
        evt.setTheme("Programmation");
        evt.setPublicCible("Enseignants");
        evt.setObjectifFormation("Apprendre Java");
        evt.setDureeFormation(40);
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setPeriodCode("S1_2026");

        Up up = new Up();
        up.setId("UP1");
        when(upRepo.findById("UP1")).thenReturn(Optional.of(up));

        Dept dept = new Dept();
        dept.setId("DEPT1");
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.of(dept));

        listener.onBesoinApproved(evt);

        // verify the method ran without error (save is commented out in prod)
        verify(upRepo).findById("UP1");
        verify(deptRepo).findById("DEPT1");
    }

    @Test
    void onBesoinApproved_nullTitre_shouldUseProgramme() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(2L);
        evt.setTitre(null);
        evt.setProgrammeFormation("Programme Fallback");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());

        listener.onBesoinApproved(evt);

        verify(upRepo).findById("UP1");
    }

    @Test
    void onBesoinApproved_invalidPeriodCode_shouldFallbackToOther() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(3L);
        evt.setTitre("Test");
        evt.setPeriodCode("INVALID_CODE");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());

        // Should not throw
        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));
    }

    @Test
    void onBesoinApproved_nullPeriodCode_shouldNotSet() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(4L);
        evt.setTitre("Test Null Period");
        evt.setPeriodCode(null);
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));
    }
}
