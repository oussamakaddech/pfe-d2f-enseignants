package esprit.pfe.serviceformation.service;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Presence;
import esprit.pfe.serviceformation.entities.PresenceStatus;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PresenceIndicatorServiceTest {

    @Mock
    private PresenceRepository presenceRepository;

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @InjectMocks
    private PresenceIndicatorService service;

    private Enseignant participant;
    private SeanceFormation s1;
    private SeanceFormation s2;

    @BeforeEach
    void setUp() {
        participant = new Enseignant();
        participant.setId("P001");
        participant.setNom("Doe");
        participant.setPrenom("John");

        s1 = new SeanceFormation();
        s1.setIdSeance(101L);
        s1.setHeureDebut(LocalTime.of(9, 0));
        s1.setHeureFin(LocalTime.of(10, 0));

        s2 = new SeanceFormation();
        s2.setIdSeance(102L);
        s2.setHeureDebut(LocalTime.of(9, 0));
        s2.setHeureFin(LocalTime.of(10, 0));
    }

    private Presence presence(SeanceFormation seance, PresenceStatus status,
                              LocalTime arrival, LocalTime departure, boolean justified) {
        Presence p = new Presence();
        p.setSeanceFormation(seance);
        p.setEnseignant(participant);
        if (status != null) {
            p.setStatus(status);
        }
        p.setPresent(status == PresenceStatus.PRESENT || status == PresenceStatus.LATE);
        p.setArrivalTime(arrival);
        p.setDepartureTime(departure);
        p.setJustification(justified ? "Motif médical validé" : null);
        return p;
    }

    @Test
    void calculatePresenceIndicators_WithoutSessions_ShouldReturnZeros() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of());

        var dto = service.calculatePresenceIndicators(1L, "P001");

        assertEquals(0.0, dto.getAttendanceRate());
        assertEquals(0.0, dto.getExpectedMinutes());
        assertEquals(0.0, dto.getTrackedMinutes());
        assertTrue(dto.getLateCount() == 0 && dto.getAbsentCount() == 0);
    }

    @Test
    void calculatePresenceIndicators_WithLateArrival_ShouldCountTrackedMinutesFromArrival() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1, s2));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of(
                        presence(s1, PresenceStatus.PRESENT, null, null, false),
                        presence(s2, PresenceStatus.LATE, LocalTime.of(9, 15), null, false)));

        var dto = service.calculatePresenceIndicators(1L, "P001");

        // Séance 1 : présent 60 min — Séance 2 : retard, suivi depuis 09:15 → 45 min
        assertEquals(120.0, dto.getExpectedMinutes());
        assertEquals(105.0, dto.getTrackedMinutes());
        assertEquals(87.5, dto.getAttendanceRate());
        assertEquals(1, dto.getLateCount());
        assertEquals(50.0, dto.getLateRate());
        assertEquals(0, dto.getAbsentCount());
        assertEquals(100.0, dto.getCompletionRate());
        assertEquals(52.5, dto.getMinPerSession());
    }

    @Test
    void calculatePresenceIndicators_WithAbsence_ShouldComputeRates() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1, s2));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of(
                        presence(s1, PresenceStatus.ABSENT, null, null, false),
                        presence(s2, PresenceStatus.PRESENT, null, null, false)));

        var dto = service.calculatePresenceIndicators(1L, "P001");

        assertEquals(60.0, dto.getTrackedMinutes());
        assertEquals(50.0, dto.getAttendanceRate());
        assertEquals(1, dto.getAbsentCount());
        assertEquals(50.0, dto.getAbsenceRate());
        assertEquals(50.0, dto.getCompletionRate());
    }

    @Test
    void calculatePresenceIndicators_WithExcusedJustified_ShouldComputeJustificationRate() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1, s2));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of(
                        presence(s1, PresenceStatus.EXCUSED, null, null, true),
                        presence(s2, PresenceStatus.ABSENT, null, null, false)));

        var dto = service.calculatePresenceIndicators(1L, "P001");

        assertEquals(1, dto.getExcusedCount());
        assertEquals(50.0, dto.getExcusedRate());
        // 1 absence justifiée sur 2 absences
        assertEquals(50.0, dto.getJustificationRate());
    }

    @Test
    void calculatePresenceIndicators_WithoutPresenceRow_ShouldTreatAsAbsent() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of());

        var dto = service.calculatePresenceIndicators(1L, "P001");

        assertEquals(0.0, dto.getAttendanceRate());
        assertEquals(1, dto.getAbsentCount());
        assertEquals(100.0, dto.getAbsenceRate());
    }

    @Test
    void calculatePresenceIndicators_WithEarlyDeparture_ShouldBoundTrackedMinutes() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of(presence(s1, PresenceStatus.PRESENT, null, LocalTime.of(9, 30), false)));

        var dto = service.calculatePresenceIndicators(1L, "P001");

        // Départ à 09:30 → 30 minutes suivies sur 60 prévues
        assertEquals(30.0, dto.getTrackedMinutes());
        assertEquals(50.0, dto.getAttendanceRate());
    }

    @Test
    void calculateAllParticipantIndicators_ShouldAggregatePerParticipant() {
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(s1, s2));
        when(presenceRepository.findBySeanceFormation_Formation_IdFormation(1L))
                .thenReturn(List.of(
                        presence(s1, PresenceStatus.PRESENT, null, null, false),
                        presence(s2, PresenceStatus.ABSENT, null, null, false)));
        when(presenceRepository.findByEnseignant_IdAndSeanceFormation_Formation_IdFormation("P001", 1L))
                .thenReturn(List.of(
                        presence(s1, PresenceStatus.PRESENT, null, null, false),
                        presence(s2, PresenceStatus.ABSENT, null, null, false)));

        var result = service.calculateAllParticipantIndicators(1L);

        assertEquals(1, result.size());
        var dto = result.get("P001");
        assertEquals(50.0, dto.getAttendanceRate());
    }
}
