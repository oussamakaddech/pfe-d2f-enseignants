package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;


import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationStateScheduler - Tests unitaires")
class FormationStateSchedulerTest {

    @Mock private FormationRepository formationRepository;
    @Mock private FormationWorkflowService formationWorkflowService;

    @InjectMocks
    private FormationStateScheduler scheduler;

    @Test
    @DisplayName("updateFormationStates - Passage à PLANIFIE")
    void shouldUpdateToPlanifie() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setEtatFormation(EtatFormation.ENREGISTRE);
        
        // Date debut in the future
        f.setDateDebut(new Date(System.currentTimeMillis() + 100000));
        f.setDateFin(new Date(System.currentTimeMillis() + 200000));
        
        when(formationRepository.findAll()).thenReturn(List.of(f));

        scheduler.updateFormationStates();

        verify(formationRepository).save(f);
        verify(formationWorkflowService).handleEtatTransitions(f, EtatFormation.ENREGISTRE);
    }

    @Test
    @DisplayName("updateFormationStates - Passage à EN_COURS")
    void shouldUpdateToEnCours() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setEtatFormation(EtatFormation.PLANIFIE);
        
        // now is between debut and fin
        f.setDateDebut(new Date(System.currentTimeMillis() - 100000));
        f.setDateFin(new Date(System.currentTimeMillis() + 100000));
        
        when(formationRepository.findAll()).thenReturn(List.of(f));

        scheduler.updateFormationStates();

        verify(formationWorkflowService).handleEtatTransitions(f, EtatFormation.PLANIFIE);
    }

    @Test
    @DisplayName("updateFormationStates - Passage à ACHEVE")
    void shouldUpdateToAcheve() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setEtatFormation(EtatFormation.EN_COURS);
        
        // Date fin in the past
        f.setDateDebut(new Date(System.currentTimeMillis() - 200000));
        f.setDateFin(new Date(System.currentTimeMillis() - 100000));
        
        when(formationRepository.findAll()).thenReturn(List.of(f));

        scheduler.updateFormationStates();

        verify(formationWorkflowService).handleEtatTransitions(f, EtatFormation.EN_COURS);
    }
}
