package esprit.pfe.serviceformation.messaging;

import com.rabbitmq.client.Channel;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    @Mock private Channel channel;

    // SimpleMeterRegistry is a real in-memory registry — no mocking needed
    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();

    private BesoinFormationEventListener listener;

    @BeforeEach
    void setUp() {
        // Manual construction because the constructor requires MeterRegistry
        listener = new BesoinFormationEventListener(repo, upRepo, deptRepo, meterRegistry);
    }

    @Test
    void onBesoinApproved_shouldCreateAndSaveFormation() throws java.io.IOException {

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

        listener.onBesoinApproved(evt, channel, 1L);

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
        verify(channel).basicAck(1L, false);
    }

    @Test
    void onBesoinApproved_nullTitre_shouldUseProgramme() {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(2L);
        evt.setTitre(null);
        evt.setProgrammeFormation("Programme Fallback");
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        listener.onBesoinApproved(evt, channel, 2L);

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getTitreFormation()).isEqualTo("Programme Fallback");
    }

    @Test
    void onBesoinApproved_invalidPeriodCode_shouldFallbackToOther() {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(3L);
        evt.setTitre("Test");
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setPeriodCode("INVALID_CODE");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 3L));

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getPeriodCode()).isEqualTo(PeriodCode.OTHER);
    }

    @Test
    void onBesoinApproved_nullPeriodCode_shouldNotSet() {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(4L);
        evt.setTitre("Test Null Period");
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setPeriodCode(null);
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(20);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 4L));
        verify(repo).save(any(Formation.class));
    }

    @Test
    void onBesoinApproved_invalidPayload_shouldAckWithoutSaving() throws java.io.IOException {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(0L);
        evt.setTitre("Invalid");
        evt.setTypeBesoin("INDIVIDUEL");

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 7L));

        verify(repo, never()).save(any(Formation.class));
        verify(channel).basicAck(7L, false);
    }

    @Test
    void onBesoinApproved_duplicateId_shouldAckWithoutSaving() throws java.io.IOException {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(8L);
        evt.setTitre("Duplicate Formation");
        evt.setTypeBesoin("INDIVIDUEL");

        when(repo.existsByIdBesoinFormation(8L)).thenReturn(true);

        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 8L));

        verify(repo, never()).save(any(Formation.class));
        verify(channel).basicAck(8L, false);
    }

    @Test
    void onBesoinApproved_duplicateEntry_shouldHandleDataIntegrityViolation() {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(5L);
        evt.setTitre("Duplicate Formation");
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(10);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate key"));

        // Should NOT propagate the exception
        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 5L));
        verify(repo).save(any(Formation.class));
    }

    @Test
    void onBesoinApproved_unexpectedException_shouldBeHandled() throws java.io.IOException {

        BesoinFormationApprovedEvent evt = new BesoinFormationApprovedEvent();
        evt.setIdBesoinFormation(6L);
        evt.setTitre("Error Formation");
        evt.setTypeBesoin("INDIVIDUEL");
        evt.setUp("UP1");
        evt.setDepartement("DEPT1");
        evt.setDureeFormation(10);

        when(upRepo.findById("UP1")).thenReturn(Optional.empty());
        when(deptRepo.findById("DEPT1")).thenReturn(Optional.empty());
        when(repo.save(any(Formation.class)))
                .thenThrow(new RuntimeException("DB connection lost"));

        // Should NOT propagate the exception
        assertDoesNotThrow(() -> listener.onBesoinApproved(evt, channel, 6L));
        verify(repo).save(any(Formation.class));
        verify(channel).basicNack(6L, false, false);
    }
}
