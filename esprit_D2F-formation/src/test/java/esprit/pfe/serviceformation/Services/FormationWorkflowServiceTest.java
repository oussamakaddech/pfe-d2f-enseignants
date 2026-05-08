package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.messaging.EvaluationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Tests unitaires")
class FormationWorkflowServiceTest {

    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceFormationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private UpRepository upRepository;
    @Mock private EvaluationPublisher evaluationPublisher;
    @Mock private OutlookCalendarService outlookCalendarService;
    @Mock private OutlookMailService outlookMailService;
    @Mock private PresenceRepository presenceRepository;
    @Mock private DocumentRepository documentRepository;

    @InjectMocks
    private FormationWorkflowService formationWorkflowService;

    private FormationWorkflowRequest request;

    @BeforeEach
    void setUp() {
        request = new FormationWorkflowRequest();
        request.setTitreFormation("Formation Test");
        request.setTypeBesoin("PROJET");
        
        Calendar cal = Calendar.getInstance();
        cal.set(2026, Calendar.JANUARY, 1);
        request.setDateDebut(cal.getTime());
        cal.set(2026, Calendar.DECEMBER, 31);
        request.setDateFin(cal.getTime());
        
        request.setTypeFormation(TypeFormation.INTERNE);
        request.setObjectifs("Test Objectifs");
        request.setSeances(new ArrayList<>());
    }

    @Test
    @DisplayName("createFormationWorkflow - Création avec séances et succès")
    void shouldCreateFormationWithSeances() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));
        
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> {
            Formation f = inv.getArgument(0);
            if (f.getIdFormation() == null) f.setIdFormation(1L);
            return f;
        });
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(false);

        Formation result = formationWorkflowService.createFormationWorkflow(request);

        assertThat(result).isNotNull();
        verify(seanceFormationRepository).saveAll(anyList());
        verify(presenceRepository).saveAll(anyList());
        verify(evaluationPublisher).sendCreate(any());
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("createFormationWorkflow - Échec si conflit de séance")
    void shouldFailWhenSeanceConflict() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));
        
        lenient().when(formationRepository.save(any())).thenReturn(new Formation());
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(true);
        lenient().when(seanceFormationRepository.findByParticipantAndDate(anyString(), any())).thenReturn(List.of(new SeanceFormation()));
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));

        assertThrows(RuntimeException.class, () -> formationWorkflowService.createFormationWorkflow(request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour et changement d'état")
    void shouldUpdateFormationAndChangeStatus() {
        Formation existing = new Formation();
        existing.setIdFormation(1L);
        existing.setEtatFormation(EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.VISIBLE);
        
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setMail("test@esprit.tn");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);
        lenient().when(enseignantRepository.findAll()).thenReturn(List.of(e));

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.VISIBLE);
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("deleteFormationWorkflow - Suppression")
    void shouldDeleteFormation() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setSeances(new ArrayList<>());
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        
        formationWorkflowService.deleteFormationWorkflow(1L);
        
        verify(formationRepository).delete(formation);
    }

    private FormationWorkflowRequest.SeanceRequest createSeanceRequest(String date, String debut, String fin) {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        try {
            sr.setDateSeance(new java.text.SimpleDateFormat("yyyy-MM-dd").parse(date));
        } catch (Exception e) {}
        sr.setHeureDebut(debut);
        sr.setHeureFin(fin);
        return sr;
    }
}
