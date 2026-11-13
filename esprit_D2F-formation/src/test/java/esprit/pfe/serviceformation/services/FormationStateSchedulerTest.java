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

import java.time.LocalDate;
import java.util.List;


import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
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
        f.setDateDebut(LocalDate.now().plusDays(1));
        f.setDateFin(LocalDate.now().plusDays(2));
        
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
        f.setDateDebut(LocalDate.now().minusDays(1));
        f.setDateFin(LocalDate.now().plusDays(1));
        
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
        f.setDateDebut(LocalDate.now().minusDays(2));
        f.setDateFin(LocalDate.now().minusDays(1));
        
        when(formationRepository.findAll()).thenReturn(List.of(f));

        scheduler.updateFormationStates();

        verify(formationWorkflowService).handleEtatTransitions(f, EtatFormation.EN_COURS);
    }

    private static Formation formation(LocalDate debut, LocalDate fin) {
        Formation f = new Formation();
        f.setIdFormation(51L);
        f.setDateDebut(debut);
        f.setDateFin(fin);
        return f;
    }

    @Test
    @DisplayName("computeNextState - Jour de début : EN_COURS (et non ACHEVE)")
    void startDay_isEnCours() {
        LocalDate today = LocalDate.of(2026, 10, 20);
        assertEquals(EtatFormation.EN_COURS,
                FormationStateScheduler.computeNextState(formation(today, today.plusDays(56)), today));
    }

    @Test
    @DisplayName("computeNextState - Jour de fin : encore EN_COURS ; lendemain : ACHEVE")
    void endDay_isEnCours_thenAcheveOnceEndDatePassed() {
        LocalDate fin = LocalDate.of(2026, 12, 15);
        Formation f = formation(LocalDate.of(2026, 10, 20), fin);
        assertEquals(EtatFormation.EN_COURS, FormationStateScheduler.computeNextState(f, fin));
        assertEquals(EtatFormation.ACHEVE, FormationStateScheduler.computeNextState(f, fin.plusDays(1)));
    }

    @Test
    @DisplayName("computeNextState - Formation d'un seul jour")
    void singleDayFormation() {
        LocalDate day = LocalDate.of(2026, 11, 3);
        Formation f = formation(day, day);
        assertEquals(EtatFormation.PLANIFIE, FormationStateScheduler.computeNextState(f, day.minusDays(1)));
        assertEquals(EtatFormation.EN_COURS, FormationStateScheduler.computeNextState(f, day));
        assertEquals(EtatFormation.ACHEVE, FormationStateScheduler.computeNextState(f, day.plusDays(1)));
    }

    @Test
    @DisplayName("updateFormationStates - Dates manquantes : état inchangé, pas d'erreur")
    void missingDates_keepState() {
        Formation f = formation(null, null);
        f.setEtatFormation(EtatFormation.ENREGISTRE);
        when(formationRepository.findAll()).thenReturn(List.of(f));

        scheduler.updateFormationStates();

        assertEquals(EtatFormation.ENREGISTRE, f.getEtatFormation());
        verify(formationWorkflowService, never()).handleEtatTransitions(any(), any());
    }

    @Test
    @DisplayName("updateFormationStates - Une formation en erreur ne bloque pas les suivantes")
    void oneFailure_doesNotStopOthers() {
        Formation ko = formation(LocalDate.now().minusDays(5), LocalDate.now().minusDays(2));
        ko.setEtatFormation(EtatFormation.EN_COURS);
        Formation ok = formation(LocalDate.now().minusDays(5), LocalDate.now().minusDays(2));
        ok.setIdFormation(52L);
        ok.setEtatFormation(EtatFormation.EN_COURS);
        when(formationRepository.findAll()).thenReturn(List.of(ko, ok));
        doThrow(new RuntimeException("mail KO"))
                .when(formationWorkflowService).handleEtatTransitions(ko, EtatFormation.EN_COURS);

        scheduler.updateFormationStates();

        assertEquals(EtatFormation.ACHEVE, ok.getEtatFormation());
        verify(formationRepository).save(ok);
    }
}
