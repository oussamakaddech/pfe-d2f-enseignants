package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
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
@DisplayName("FormationWorkflowServicePresenceHelper - Tests unitaires")
class FormationWorkflowServicePresenceHelperTest {

    @Mock private PresenceRepository presenceRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private SeanceFormationRepository seanceFormationRepository;

    @InjectMocks
    private FormationWorkflowServicePresenceHelper presenceHelper;

    private SeanceFormation seance;
    private Enseignant enseignant;

    @BeforeEach
    void setUp() {
        seance = new SeanceFormation();
        seance.setIdSeance(1L);
        
        enseignant = new Enseignant();
        enseignant.setId("E1");
        enseignant.setNom("Test");
    }

    @Test
    @DisplayName("syncPresencesForSeances - Succès")
    void shouldSyncPresencesForSeances() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());
        when(enseignantRepository.findById("E1")).thenReturn(Optional.of(enseignant));

        presenceHelper.syncPresencesForSeances(List.of(seance), List.of("E1"));

        verify(presenceRepository).save(any(Presence.class));
    }

    @Test
    @DisplayName("syncPresencesForSeances - Suppression des anciens")
    void shouldDeleteOldPresences() {
        Presence p = new Presence();
        p.setEnseignant(enseignant);
        
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p));

        presenceHelper.syncPresencesForSeances(List.of(seance), List.of());

        verify(presenceRepository).delete(p);
    }

    @Test
    @DisplayName("createEvaluationDTOs - Succès")
    void shouldCreateEvaluationDTOs() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        
        seance.setParticipants(List.of(enseignant));
        seance.setAnimateurs(List.of(enseignant));

        List<EvaluationFormateurDTO> dtos = presenceHelper.createEvaluationDTOs(List.of(seance), f);

        assertThat(dtos).hasSize(1); // E1 is both participant and animateur, but only one DTO should be created
        assertThat(dtos.get(0).getEnseignantId()).isEqualTo("E1");
    }
}
