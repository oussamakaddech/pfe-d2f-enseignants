package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinFormationEventListenerTest {

    @Mock private FormationRepository repo;
    @Mock private UpRepository upRepo;
    @Mock private DeptRepository deptRepo;
    @InjectMocks private BesoinFormationEventListener listener;

    @Test
    void onBesoinApproved_shouldCreateAndSaveFormation() {
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

        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        listener.onBesoinApproved(evt);

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repo).save(captor.capture());

        Formation saved = captor.getValue();
        assertThat(saved.getIdBesoinFormation()).isEqualTo(1L);
        assertThat(saved.getTitreFormation()).isEqualTo("Formation Java");
        assertThat(saved.getTypeFormation()).isEqualTo(TypeFormation.INTERNE);
        assertThat(saved.getEtatFormation()).isEqualTo(EtatFormation.NOUVEAU);
        assertThat(saved.getUp()).isEqualTo(up);
        assertThat(saved.getDepartement()).isEqualTo(dept);
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
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        listener.onBesoinApproved(evt);

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getTitreFormation()).isEqualTo("Programme Fallback");
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
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getPeriodCode()).isEqualTo(PeriodCode.OTHER);
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
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));
        verify(repo).save(any(Formation.class));
    }

    @Test
    void onBesoinApproved_duplicateEntry_shouldHandleDataIntegrityViolation() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(5L);
        evt.setTitre("Duplicate Formation");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(10);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate key"));

        // Should NOT propagate the exception
        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));
        verify(repo).save(any(Formation.class));
    }

    @Test
    void onBesoinApproved_unexpectedException_shouldBeHandled() {
        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(6L);
        evt.setTitre("Error Formation");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(10);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class)))
                .thenThrow(new RuntimeException("DB connection lost"));

        // Should NOT propagate the exception
        assertDoesNotThrow(() -> listener.onBesoinApproved(evt));
        verify(repo).save(any(Formation.class));
    }
}
