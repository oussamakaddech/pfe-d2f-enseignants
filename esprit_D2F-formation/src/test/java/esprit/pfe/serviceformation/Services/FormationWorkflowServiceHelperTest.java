package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationWorkflowRequest;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Time;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowServiceHelper - Tests unitaires")
class FormationWorkflowServiceHelperTest {

    @Mock private SeanceFormationRepository seanceFormationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private PresenceRepository presenceRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private UpRepository upRepository;

    @InjectMocks
    private FormationWorkflowServiceHelper helper;

    private Formation formation;
    private FormationWorkflowRequest request;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setDateDebut(new Date());
        
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_MONTH, 5);
        formation.setDateFin(cal.getTime());

        request = new FormationWorkflowRequest();
        request.setIdBesoinFormation(100L);
        request.setTitreFormation("Test Helper");
        request.setDateDebut(formation.getDateDebut());
        request.setDateFin(formation.getDateFin());
    }

    @Test
    @DisplayName("initFormationFromRequest - Devrait initialiser la formation")
    void shouldInitFormationFromRequest() {
        request.setUpId("UP1");
        request.setDepartementId("DEP1");
        request.setPeriodCode("WINTER");

        when(upRepository.findById("UP1")).thenReturn(Optional.of(new Up()));
        when(departementRepository.findById("DEP1")).thenReturn(Optional.of(new Dept()));

        helper.initFormationFromRequest(formation, request);

        assertThat(formation.getIdBesoinFormation()).isEqualTo(100L);
        assertThat(formation.getTitreFormation()).isEqualTo("Test Helper");
        assertThat(formation.getPeriodCode()).isEqualTo(PeriodCode.WINTER);
        assertThat(formation.getEtatFormation()).isEqualTo(EtatFormation.ENREGISTRE);
    }

    @Test
    @DisplayName("parseTime - Devrait parser correctement")
    void shouldParseTime() {
        Time time1 = helper.parseTime("09:00");
        assertThat(time1).hasToString("09:00:00");

        assertThrows(IllegalArgumentException.class, () -> helper.parseTime("invalid"));
        assertThrows(IllegalArgumentException.class, () -> helper.parseTime(null));
    }

    @Test
    @DisplayName("createEvaluationDTOs - Devrait créer les DTOs sans doublons")
    void shouldCreateEvaluationDTOs() {
        SeanceFormation s1 = new SeanceFormation();
        Enseignant p1 = new Enseignant(); p1.setId("P1");
        Enseignant a1 = new Enseignant(); a1.setId("A1");
        s1.setParticipants(List.of(p1));
        s1.setAnimateurs(List.of(a1));

        SeanceFormation s2 = new SeanceFormation();
        s2.setParticipants(List.of(p1)); // P1 again
        Enseignant a2 = new Enseignant(); a2.setId("A2");
        s2.setAnimateurs(List.of(a2));

        List<EvaluationFormateurDTO> dtos = helper.createEvaluationDTOs(List.of(s1, s2), formation);

        assertThat(dtos).hasSize(3); // P1, A1, A2
    }

    @Test
    @DisplayName("ensureNoConflict - Pas de conflit")
    void shouldEnsureNoConflict_whenNoConflict() {
        when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);

        helper.ensureNoConflict("USER1", new Date(), new Time(0), new Time(1), false, null, 1L);
        verify(seanceFormationRepository).existsSeanceConflict(anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("ensureNoConflict - Avec conflit jette exception")
    void shouldEnsureNoConflict_whenConflictThrowsException() {
        when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(true);
        
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(99L);
        existing.setHeureDebut(Time.valueOf("09:00:00"));
        existing.setHeureFin(Time.valueOf("11:00:00"));
        existing.setDateSeance(new Date());
        Formation f = new Formation();
        f.setIdFormation(2L);
        f.setTitreFormation("Existing Formation");
        existing.setFormation(f);

        when(seanceFormationRepository.findByParticipantAndDate(anyString(), any())).thenReturn(List.of(existing));
        
        Enseignant e = new Enseignant();
        e.setNom("Ben"); e.setPrenom("Ali"); e.setMail("test@test.tn");
        when(enseignantRepository.findById("USER1")).thenReturn(Optional.of(e));

        Time startTime = Time.valueOf("09:30:00");
        Time endTime = Time.valueOf("10:30:00");
        Date date = new Date();
        assertThrows(IllegalStateException.class,
            () -> helper.ensureNoConflict("USER1", date, startTime, endTime, false, null, 1L));
    }
    @Test
    @DisplayName("createSeancesForFormation - Succès")
    void shouldCreateSeancesForFormation() {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setDateSeance(formation.getDateDebut());
        sr.setHeureDebut("09:00");
        sr.setHeureFin("11:00");
        sr.setAnimateursIds(List.of("A1"));
        
        Enseignant p1 = new Enseignant(); p1.setId("P1");
        Enseignant a1 = new Enseignant(); a1.setId("A1");
        
        when(enseignantRepository.findAllById(anyList())).thenReturn(List.of(p1));
        when(enseignantRepository.findById("A1")).thenReturn(Optional.of(a1));
        
        List<SeanceFormation> seances = helper.createSeancesForFormation(formation, List.of(sr), List.of("P1"));
        
        assertThat(seances).hasSize(1);
        assertThat(seances.get(0).getAnimateurs()).contains(a1);
        assertThat(seances.get(0).getParticipants()).contains(p1);
    }

    @Test
    @DisplayName("createSeancesForFormation - Échec si date hors plage")
    void shouldFailWhenSeanceDateOutOfRange() {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        Calendar cal = Calendar.getInstance();
        cal.setTime(formation.getDateDebut());
        cal.add(Calendar.DAY_OF_MONTH, -1);
        sr.setDateSeance(cal.getTime());

        List<FormationWorkflowRequest.SeanceRequest> seanceRequests = List.of(sr);
        List<String> emptyList = List.of();
        assertThrows(IllegalStateException.class,
            () -> helper.createSeancesForFormation(formation, seanceRequests, emptyList));
    }

    @Test
    @DisplayName("createSeancesForFormation - Échec si conflit de salle")
    void shouldFailWhenSalleConflict() {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setDateSeance(formation.getDateDebut());
        sr.setHeureDebut("09:00");
        sr.setHeureFin("11:00");
        sr.setSalle("S1");
        
        when(seanceFormationRepository.existsSalleConflict(eq("S1"), any(), any(), any())).thenReturn(true);
        
        List<FormationWorkflowRequest.SeanceRequest> seances = List.of(sr);
        List<String> emptyParticipants = List.of();
        assertThrows(IllegalStateException.class,
            () -> helper.createSeancesForFormation(formation, seances, emptyParticipants));
    }

    @Test
    @DisplayName("createPresencesForSeances - Succès")
    void shouldCreatePresencesForSeances() {
        SeanceFormation sf = new SeanceFormation();
        Enseignant p1 = new Enseignant(); p1.setId("P1");
        sf.setParticipants(List.of(p1));
        
        List<Presence> presences = helper.createPresencesForSeances(List.of(sf));
        
        assertThat(presences).hasSize(1);
        assertThat(presences.get(0).getEnseignant()).isEqualTo(p1);
    }

    @Test
    @DisplayName("convertToOffsetDateTime - Succès")
    void shouldConvertToOffsetDateTime() {
        Date d = new Date();
        Time t = Time.valueOf("09:00:00");
        
        java.time.OffsetDateTime odt = helper.convertToOffsetDateTime(d, t);
        
        assertThat(odt).isNotNull();
        assertThat(odt.getHour()).isEqualTo(9);
    }

    @Test
    @DisplayName("convertToOffsetDateTime - Échec si date ou heure null")
    void shouldRejectNullDateOrTime() {
        Time t = Time.valueOf("09:00:00");

        assertThrows(IllegalArgumentException.class, () -> helper.convertToOffsetDateTime(null, t));
        assertThrows(IllegalArgumentException.class, () -> helper.convertToOffsetDateTime(new Date(), null));
    }
}
