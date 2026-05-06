package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.*;
import esprit.pfe.serviceformation.Microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.Microsoft.OutlookMailService;
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
        request.setDateDebut(new Date());
        request.setDateFin(new Date());
        request.setTypeFormation(TypeFormation.INTERNE);
        request.setObjectifs("Test Objectifs");
        request.setSeances(new ArrayList<>());
    }

    @Test
    @DisplayName("createFormationWorkflow - Création simple sans séances")
    void shouldCreateFormationWithoutSeances() {
        when(formationRepository.save(any())).thenAnswer(inv -> {
            Formation f = inv.getArgument(0);
            if (f.getIdFormation() == null) f.setIdFormation(1L);
            return f;
        });

        Formation result = formationWorkflowService.createFormationWorkflow(request);

        assertThat(result).isNotNull();
        assertThat(result.getIdFormation()).isEqualTo(1L);
        assertThat(result.getTitreFormation()).isEqualTo("Formation Test");
        verify(formationRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("getFormationWorkflowById - Succès")
    void shouldGetById() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Test");
        formation.setSeances(new ArrayList<>());
        formation.setFormationCompetences(new ArrayList<>());

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

        FormationDTO result = formationWorkflowService.getFormationWorkflowById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getIdFormation()).isEqualTo(1L);
        verify(formationRepository).findById(1L);
    }
}
